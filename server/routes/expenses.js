// Expenses fake routes. Any signed-in user reads; writes need ADMIN, ACCOUNTING or ENGINEER (management is
// read-only), like the backend. Messages mirror the backend's.
const { taxParametersAt } = require('./accounting');

const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];
const CATEGORIES = ['MATERIALS', 'LABOR', 'TRAVEL_EXPENSES', 'OTHER'];
const VOUCHER_TYPES = ['INVOICE', 'SALES_RECEIPT', 'FEE_RECEIPT', 'NO_VOUCHER'];
const PAYMENT_METHODS = ['BANK_ACCOUNT', 'PETTY_CASH', 'PARTNER_CONTRIBUTION'];
const SUPPLIER_TYPES = ['COMPANY', 'NATURAL_PERSON'];

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const expenses = () => db.get('expenses');
  const suppliers = () => db.get('suppliers');

  // GET /expenses?projectId=&year=&month=&category= (year and month go together). Annulled ones are listed.
  server.get('/api/v1/expenses', requireRoles(), (req, res) => {
    const { projectId, year, month, category } = req.query;
    if ((year === undefined) !== (month === undefined)) {
      return problem(res, 400, 'Bad Request', 'year y month deben enviarse juntos.');
    }
    if (category !== undefined && !CATEGORIES.includes(category)) {
      return problem(res, 400, 'Bad Request', 'Categoría no válida.');
    }
    const prefix = year === undefined ? null : `${year}-${String(month).padStart(2, '0')}`;
    const result = expenses()
      .filter((e) => !projectId || e.projectId === Number(projectId))
      .filter((e) => !prefix || e.spentOn.startsWith(prefix))
      .filter((e) => !category || e.category === category)
      .sortBy('spentOn')
      .value();
    res.json(result);
  });

  server.get('/api/v1/expenses/:id', requireRoles(), (req, res) => {
    const expense = expenses().find({ id: Number(req.params.id) }).value();
    if (!expense) return problem(res, 404, 'Not Found', 'Gasto no encontrado.');
    res.json(expense);
  });

  // Registering: only an invoice splits out IGV (rates in force on the spending date); anything else has none.
  server.post('/api/v1/expenses', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const amount = Number(body.amount);
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const number = typeof body.voucherNumber === 'string' ? body.voucherNumber.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.spentOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha del gasto no es válida.');
    if (!CATEGORIES.includes(body.category)) return problem(res, 400, 'Bad Request', 'Categoría no válida.');
    if (!VOUCHER_TYPES.includes(body.voucherType)) return problem(res, 400, 'Bad Request', 'Tipo de comprobante no válido.');
    if (!PAYMENT_METHODS.includes(body.paymentMethod)) return problem(res, 400, 'Bad Request', 'Medio de pago no válido.');
    if (typeof body.paid !== 'boolean') return problem(res, 400, 'Bad Request', 'Indica si el gasto ya está pagado.');
    if (!(amount > 0) || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
      return problem(res, 400, 'Bad Request', 'El monto debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (description.length > 500) return problem(res, 400, 'Bad Request', 'La descripción admite hasta 500 caracteres.');
    if (number.length > 30) return problem(res, 400, 'Bad Request', 'El número de comprobante admite hasta 30 caracteres.');
    if (body.voucherType === 'NO_VOUCHER' && number) {
      return problem(res, 400, 'Bad Request', 'Un gasto sin comprobante no lleva número de comprobante.');
    }
    if (body.voucherType !== 'NO_VOUCHER' && !number) {
      return problem(res, 400, 'Bad Request', 'El número de comprobante es obligatorio.');
    }
    if (body.currency !== 'PEN') {
      return problem(res, 422, 'Unprocessable Entity', 'Por ahora los gastos solo pueden registrarse en PEN.');
    }
    const partner = body.paymentMethod === 'PARTNER_CONTRIBUTION';
    if (partner && (!body.partnerId || body.bankAccountId)) {
      return problem(res, 400, 'Bad Request', 'Un aporte de socio necesita el socio y no lleva cuenta.');
    }
    if (!partner && (!body.bankAccountId || body.partnerId)) {
      return problem(res, 400, 'Bad Request', 'Un pago con cuenta bancaria o caja chica necesita la cuenta y no lleva socio.');
    }
    const projectId = body.projectId ?? null;
    if (projectId !== null) {
      const project = db.get('projects').find({ id: Number(projectId) }).value();
      if (!project) return problem(res, 404, 'Not Found', 'Proyecto no encontrado.');
      if (project.status === 'CANCELLED') {
        return problem(res, 409, 'Conflict', 'El proyecto está cancelado y no admite nuevos gastos.');
      }
    }
    if (body.supplierId != null && !suppliers().find({ id: Number(body.supplierId) }).value()) {
      return problem(res, 404, 'Not Found', 'Proveedor no encontrado.');
    }
    if (body.bankAccountId != null && !db.get('bank-accounts').find({ id: Number(body.bankAccountId) }).value()) {
      return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    }
    if (body.partnerId != null && !db.get('partners').find({ id: Number(body.partnerId) }).value()) {
      return problem(res, 404, 'Not Found', 'Socio no encontrado.');
    }

    // Integer cents, HALF_UP, like the backend TaxBreakdown.
    const cents = Math.round(amount * 100);
    const rate = (taxParametersAt(db, body.spentOn) ?? { igv: 0.18 }).igv;
    const bp = Math.round(rate * 10000);
    let baseC = cents;
    let igvC = 0;
    if (body.voucherType === 'INVOICE') {
      if (body.amountIncludesIgv === true) {
        baseC = Math.round((cents * 10000) / (10000 + bp));
        igvC = cents - baseC;
      } else {
        igvC = Math.round((cents * bp) / 10000);
      }
    }
    const expense = {
      id: nextId('expenses'),
      spentOn: body.spentOn,
      projectId: projectId === null ? null : Number(projectId),
      supplierId: body.supplierId == null ? null : Number(body.supplierId),
      category: body.category,
      description: description || null,
      voucherType: body.voucherType,
      voucherNumber: number || null,
      taxableBase: baseC / 100,
      igv: igvC / 100,
      total: (baseC + igvC) / 100,
      currency: 'PEN',
      paymentMethod: body.paymentMethod,
      bankAccountId: partner ? null : Number(body.bankAccountId),
      partnerId: partner ? Number(body.partnerId) : null,
      paymentStatus: body.paid ? 'PAID' : 'PENDING',
      annulled: false,
    };
    expenses().push(expense).write();
    res.status(201).json(expense);
  });

  // Correcting replaces category, project and description; amounts, voucher and payment never change.
  server.put('/api/v1/expenses/:id', requireRoles(...WRITERS), (req, res) => {
    const expense = expenses().find({ id: Number(req.params.id) }).value();
    if (!expense) return problem(res, 404, 'Not Found', 'Gasto no encontrado.');
    const body = req.body ?? {};
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!CATEGORIES.includes(body.category)) return problem(res, 400, 'Bad Request', 'Categoría no válida.');
    if (description.length > 500) return problem(res, 400, 'Bad Request', 'La descripción admite hasta 500 caracteres.');
    if (expense.annulled) return problem(res, 409, 'Conflict', 'El gasto está anulado y no se puede modificar.');
    const projectId = body.projectId ?? null;
    if (projectId !== null) {
      const project = db.get('projects').find({ id: Number(projectId) }).value();
      if (!project) return problem(res, 404, 'Not Found', 'Proyecto no encontrado.');
      if (project.status === 'CANCELLED') {
        return problem(res, 409, 'Conflict', 'El proyecto está cancelado y no admite nuevos gastos.');
      }
    }
    expenses()
      .find({ id: expense.id })
      .assign({ category: body.category, projectId: projectId === null ? null : Number(projectId), description: description || null })
      .write();
    res.json(expenses().find({ id: expense.id }).value());
  });

  // An expense is never deleted: annulling keeps it for audit.
  server.post('/api/v1/expenses/:id/annul', requireRoles(...WRITERS), (req, res) => {
    const expense = expenses().find({ id: Number(req.params.id) }).value();
    if (!expense) return problem(res, 404, 'Not Found', 'Gasto no encontrado.');
    if (expense.annulled) return problem(res, 409, 'Conflict', 'El gasto está anulado y no se puede modificar.');
    expenses().find({ id: expense.id }).assign({ annulled: true }).write();
    res.json(expenses().find({ id: expense.id }).value());
  });

  server.get('/api/v1/suppliers', requireRoles(), (req, res) => {
    res.json(suppliers().sortBy('businessName').value());
  });

  // A company needs a RUC; a natural person may not have one (blank counts as absent).
  server.post('/api/v1/suppliers', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const businessName = String(body.businessName ?? '').trim();
    const ruc = String(body.ruc ?? '').trim() || null;
    const phone = String(body.phone ?? '').trim() || null;
    if (!businessName || businessName.length > 200) {
      return problem(res, 400, 'Bad Request', 'La razón social es obligatoria (hasta 200 caracteres).');
    }
    if (!SUPPLIER_TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de proveedor no válido.');
    if (phone && phone.length > 30) return problem(res, 400, 'Bad Request', 'El teléfono admite hasta 30 caracteres.');
    if (ruc && !/^\d{11}$/.test(ruc)) return problem(res, 400, 'Bad Request', 'El RUC debe tener 11 dígitos.');
    if (body.type === 'COMPANY' && !ruc) {
      return problem(res, 400, 'Bad Request', 'Un proveedor de tipo empresa necesita RUC.');
    }
    if (ruc && suppliers().find({ ruc }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe un proveedor con ese RUC.');
    }
    const supplier = { id: nextId('suppliers'), businessName, ruc, type: body.type, phone };
    suppliers().push(supplier).write();
    res.status(201).json(supplier);
  });

  // Like the backend's UpdateSupplierResource: only the name and the phone change.
  server.put('/api/v1/suppliers/:id', requireRoles(...WRITERS), (req, res) => {
    const supplier = suppliers().find({ id: Number(req.params.id) }).value();
    if (!supplier) return problem(res, 404, 'Not Found', 'Proveedor no encontrado.');
    const body = req.body ?? {};
    const businessName = String(body.businessName ?? '').trim();
    const phone = String(body.phone ?? '').trim() || null;
    if (!businessName || businessName.length > 200) {
      return problem(res, 400, 'Bad Request', 'La razón social es obligatoria (hasta 200 caracteres).');
    }
    if (phone && phone.length > 30) return problem(res, 400, 'Bad Request', 'El teléfono admite hasta 30 caracteres.');
    suppliers().find({ id: supplier.id }).assign({ businessName, phone }).write();
    res.json(suppliers().find({ id: supplier.id }).value());
  });

  server.get('/api/v1/suppliers/:id', requireRoles(), (req, res) => {
    const supplier = suppliers().find({ id: Number(req.params.id) }).value();
    if (!supplier) return problem(res, 404, 'Not Found', 'Proveedor no encontrado.');
    res.json(supplier);
  });
};
