// Billing fake routes: /invoices (read: any signed-in user; issue: ADMIN, ACCOUNTING). Void, payments and
// scheduled collections are added with their screens. Responses have the exact shape of InvoiceResource.
const { taxParametersAt } = require('./accounting');

const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING'];
const STANDARD_RATES = { igv: 0.18, detraction: 0.12, retention: 0.03 };

/** Stored record → InvoiceResource (drops the internal series / correlative / hasRetention / hasDetraction). */
const invoiceResource = ({ series, correlative, hasRetention, hasDetraction, ...invoice }) => invoice;

/** Same formulas and rounding as the backend Invoice (integer cents, HALF_UP, detraction to whole units). */
const computeAmounts = (base, hasRetention, hasDetraction, rates) => {
  const bp = (rate) => Math.round(rate * 10000);
  const applyRate = (cents, rate) => Math.round((cents * bp(rate)) / 10000);
  const baseC = Math.round(base * 100);
  const igvC = applyRate(baseC, rates.igv);
  const totalC = baseC + igvC;
  const retentionC = hasRetention ? applyRate(totalC, rates.retention) : 0;
  const detractionC = hasDetraction ? Math.round(applyRate(totalC, rates.detraction) / 100) * 100 : 0;
  return {
    taxableBase: baseC / 100,
    igv: igvC / 100,
    total: totalC / 100,
    retention: retentionC / 100,
    detraction: detractionC / 100,
    netAmount: (totalC - retentionC - detractionC) / 100,
  };
};

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const invoices = () => db.get('invoices');

  server.post('/api/v1/invoices', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const series = String(body.series ?? '').trim().toUpperCase();
    const correlative = Number(body.correlative);
    const base = Number(body.taxableBase);
    if (!/^[A-Z0-9]{4}$/.test(series)) return problem(res, 400, 'Bad Request', 'La serie debe tener 4 letras o números, como F001.');
    if (!Number.isInteger(correlative) || correlative < 1 || correlative > 99999999) {
      return problem(res, 400, 'Bad Request', 'El correlativo debe estar entre 1 y 99999999.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.issuedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de emisión no es válida.');
    if (!(base > 0) || Math.round(base * 100) !== base * 100) {
      return problem(res, 400, 'Bad Request', 'La base imponible debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (body.selfDetraction && !body.hasDetraction) {
      return problem(res, 400, 'Bad Request', 'La autodetracción requiere detracción.');
    }
    const project = db.get('projects').find({ id: Number(body.projectId) }).value();
    if (!project) return problem(res, 404, 'Not Found', 'Proyecto no encontrado.');
    if (!['IN_PROGRESS', 'COMPLETED'].includes(project.status)) {
      return problem(res, 409, 'Conflict', 'Solo se puede facturar un proyecto en curso o completado.');
    }
    if (invoices().find({ series, correlative }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe una factura con esa serie y correlativo.');
    }
    const parameters = taxParametersAt(db, body.issuedOn);
    const rates = parameters ?? STANDARD_RATES;
    const amounts = computeAmounts(base, !!body.hasRetention, !!body.hasDetraction, rates);
    const invoice = {
      id: nextId('invoices'),
      series,
      correlative,
      number: `${series}-${String(correlative).padStart(8, '0')}`,
      issuedOn: body.issuedOn,
      purchaseOrder: typeof body.purchaseOrder === 'string' && body.purchaseOrder.trim() ? body.purchaseOrder.trim().slice(0, 50) : null,
      projectId: project.id,
      clientId: project.clientId,
      currency: body.currency,
      ...amounts,
      hasRetention: !!body.hasRetention,
      hasDetraction: !!body.hasDetraction,
      selfDetraction: !!body.selfDetraction,
      advance: !!body.advance,
      collectedAmount: 0,
      outstandingBalance: amounts.total,
      status: 'PENDING',
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 1000) : null,
    };
    invoices().push(invoice).write();
    res.status(201).json(invoiceResource(invoice));
  });

  // GET /invoices?status=&projectId=&year=&month= (year and month go together, like the backend).
  server.get('/api/v1/invoices', requireRoles(), (req, res) => {
    const { status, projectId, year, month } = req.query;
    if ((year === undefined) !== (month === undefined)) {
      return problem(res, 400, 'Bad Request', 'year y month deben enviarse juntos.');
    }
    const prefix = year === undefined ? null : `${year}-${String(month).padStart(2, '0')}`;
    const result = invoices()
      .filter((i) => !status || i.status === status)
      .filter((i) => !projectId || i.projectId === Number(projectId))
      .filter((i) => !prefix || i.issuedOn.startsWith(prefix))
      .sortBy('issuedOn')
      .value();
    res.json(result.map(invoiceResource));
  });

  server.get('/api/v1/invoices/:id', requireRoles(), (req, res) => {
    const invoice = invoices().find({ id: Number(req.params.id) }).value();
    if (!invoice) return problem(res, 404, 'Not Found', 'Factura no encontrada.');
    res.json(invoiceResource(invoice));
  });

  // ---------- Void and payments (same rules and messages as the backend) ----------
  const NOT_FOUND = 'Factura no encontrada.';
  const findInvoice = (req) => invoices().find({ id: Number(req.params.id) }).value();
  const paymentsOf = (invoiceId) => db.get('invoice-payments').filter({ invoiceId }).sortBy('receivedOn').value();
  // InvoicePaymentResource has no invoiceId (it is in the URL).
  const paymentResource = ({ invoiceId, ...payment }) => payment;
  const PAYMENT_TYPES = ['NET_DEPOSIT', 'DETRACTION_DEPOSIT', 'RETENTION_CERTIFICATE'];

  server.post('/api/v1/invoices/:id/void', requireRoles(...WRITERS), (req, res) => {
    const invoice = findInvoice(req);
    if (!invoice) return problem(res, 404, 'Not Found', NOT_FOUND);
    if (invoice.status === 'VOIDED') return problem(res, 409, 'Conflict', 'La factura ya está anulada.');
    if (paymentsOf(invoice.id).length > 0) return problem(res, 409, 'Conflict', 'No se puede anular una factura con pagos.');
    invoices().find({ id: invoice.id }).assign({ status: 'VOIDED' }).write();
    res.json(invoiceResource(findInvoice(req)));
  });

  server.get('/api/v1/invoices/:id/payments', requireRoles(), (req, res) => {
    const invoice = findInvoice(req);
    if (!invoice) return problem(res, 404, 'Not Found', NOT_FOUND);
    res.json(paymentsOf(invoice.id).map(paymentResource));
  });

  server.post('/api/v1/invoices/:id/payments', requireRoles(...WRITERS), (req, res) => {
    const invoice = findInvoice(req);
    if (!invoice) return problem(res, 404, 'Not Found', NOT_FOUND);
    const body = req.body ?? {};
    const amount = Number(body.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.receivedOn ?? '') || !PAYMENT_TYPES.includes(body.type) || !(amount > 0)) {
      return problem(res, 400, 'Bad Request', 'Datos de cobro no válidos.');
    }
    if (invoice.status === 'VOIDED') return problem(res, 409, 'Conflict', 'La factura ya está anulada.');
    if (body.currency !== invoice.currency) {
      return problem(res, 422, 'Unprocessable Entity', 'La moneda del pago debe ser la de la factura.');
    }
    const amountC = Math.round(amount * 100);
    const outstandingC = Math.round(invoice.outstandingBalance * 100);
    if (amountC > outstandingC) {
      return problem(res, 422, 'Unprocessable Entity', 'El pago supera el saldo pendiente de la factura.');
    }
    let account = null;
    if (body.type !== 'RETENTION_CERTIFICATE') {
      if (!body.bankAccountId) return problem(res, 400, 'Bad Request', 'Un depósito necesita la cuenta bancaria donde ingresó.');
      account = db.get('bank-accounts').find({ id: Number(body.bankAccountId) }).value();
      if (!account || account.currency !== invoice.currency) {
        return problem(res, 400, 'Bad Request', 'La cuenta bancaria no existe o es de otra moneda.');
      }
    }
    const payment = {
      id: nextId('invoice-payments'),
      invoiceId: invoice.id,
      receivedOn: body.receivedOn,
      amount: amountC / 100,
      type: body.type,
      bankAccountId: account ? account.id : null,
      reference: typeof body.reference === 'string' && body.reference.trim() ? body.reference.trim().slice(0, 100) : null,
    };
    db.get('invoice-payments').push(payment).write();
    const collectedC = Math.round(invoice.collectedAmount * 100) + amountC;
    const remainingC = Math.round(invoice.total * 100) - collectedC;
    invoices()
      .find({ id: invoice.id })
      .assign({
        collectedAmount: collectedC / 100,
        outstandingBalance: remainingC / 100,
        status: remainingC > 0 ? 'PARTIALLY_COLLECTED' : 'COLLECTED',
      })
      .write();
    // Treasury reacts to the payment event: the deposit enters the account (no cash for certificates).
    if (account) {
      const balanceC = Math.round(account.currentBalance * 100) + amountC;
      db.get('bank-accounts').find({ id: account.id }).assign({ currentBalance: balanceC / 100 }).write();
    }
    res.status(201).json(paymentResource(payment));
  });
};
