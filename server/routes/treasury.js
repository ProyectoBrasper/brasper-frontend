// Treasury fake routes. Reads are for finance roles only (backend #120); writes are ADMIN and ACCOUNTING. Same
// rules, order of checks and Spanish messages as the backend (messages_es.properties).
const { weekExists } = require('./cash-flow-week');

const READERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_MANAGEMENT'];
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING'];
const BANKS = ['BCP', 'BBVA', 'BANCO_DE_LA_NACION', 'CASH'];
const ACCOUNT_TYPES = ['CHECKING', 'DETRACTIONS', 'PETTY_CASH'];
const PAYABLE_TYPES = ['SUPPLIER', 'TECHNICIAN', 'ACCOUNTING', 'SELF_DETRACTION', 'TAX', 'OTHER'];
const LOAN_TYPES = ['RECEIVED', 'GRANTED'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Stored record → BankAccountResource (the backend does not return `openedOn`). */
const accountResource = ({ openedOn, ...account }) => account;

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const accounts = () => db.get('bank-accounts');

  server.get('/api/v1/bank-accounts', requireRoles(...READERS), (req, res) => {
    res.json(accounts().sortBy('id').value().map(accountResource));
  });

  server.get('/api/v1/bank-accounts/:id', requireRoles(...READERS), (req, res) => {
    const account = accounts().find({ id: Number(req.params.id) }).value();
    if (!account) return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    res.json(accountResource(account));
  });

  // Opening: the current balance starts at the opening balance (the backend sums the movements on top of it).
  server.post('/api/v1/bank-accounts', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
    const balance = body.openingBalance;
    if (!BANKS.includes(body.bank)) return problem(res, 400, 'Bad Request', 'Banco no válido.');
    if (!accountNumber || accountNumber.length > 50) {
      return problem(res, 400, 'Bad Request', 'El número de cuenta debe tener de 1 a 50 caracteres.');
    }
    if (!ACCOUNT_TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de cuenta no válido.');
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (typeof balance !== 'number' || balance < 0 || balance >= 1e12 || Math.abs(balance * 100 - Math.round(balance * 100)) > 1e-6) {
      return problem(res, 400, 'Bad Request', 'El saldo inicial no puede ser negativo y admite hasta 2 decimales.');
    }
    if (!ISO_DATE.test(body.openedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de apertura no es válida.');
    // Same order as BankAccountCommandService: currency first, then the duplicate number.
    if (body.currency !== 'PEN') {
      return problem(res, 422, 'Unprocessable Entity', 'Por ahora los importes solo pueden ser en PEN.');
    }
    if (accounts().find({ accountNumber }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe una cuenta bancaria con ese número.');
    }
    const account = {
      id: nextId('bank-accounts'),
      bank: body.bank,
      accountNumber,
      type: body.type,
      currency: body.currency,
      openingBalance: balance,
      currentBalance: balance,
      openedOn: body.openedOn,
    };
    accounts().push(account).write();
    res.status(201).json(accountResource(account));
  });
  // ---------- Movements, adjustments and transfers ----------
  const movements = () => db.get('cash-movements');
  const findAccount = (id) => accounts().find({ id: Number(id) }).value();
  /** Stored record → CashMovementResource (the account id is in the URL). */
  const movementResource = ({ bankAccountId, ...movement }) => movement;
  /** > 0 with at most 2 decimals and 12 integer digits (`@Positive @Digits(integer = 12, fraction = 2)`). */
  const validAmount = (value) =>
    typeof value === 'number' && value > 0 && value < 1e12 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
  const cleanConcept = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  /** Adds a movement and moves the stored balance by it (the backend sums the movements on the opening balance). */
  const postMovement = (account, occurredOn, direction, amount, concept, source, sourceId) => {
    const movement = { id: nextId('cash-movements'), bankAccountId: account.id, occurredOn, direction, amount, concept, source, sourceId };
    movements().push(movement).write();
    const cents = Math.round(account.currentBalance * 100) + (direction === 'INFLOW' ? 1 : -1) * Math.round(amount * 100);
    accounts().find({ id: account.id }).assign({ currentBalance: cents / 100 }).write();
  };

  // GET /bank-accounts/:id/movements?year=&month= (both required, like the backend).
  server.get('/api/v1/bank-accounts/:id/movements', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    }
    const account = findAccount(req.params.id);
    if (!account) return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    res.json(movements().filter((m) => m.bankAccountId === account.id && m.occurredOn.startsWith(prefix)).value().map(movementResource));
  });

  // Adjustment: answers with the account and its new balance (201).
  server.post('/api/v1/bank-accounts/:id/adjustments', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.occurredOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha no es válida.');
    if (!['INFLOW', 'OUTFLOW'].includes(body.direction)) return problem(res, 400, 'Bad Request', 'Indica si es ingreso o egreso.');
    if (!validAmount(body.amount)) return problem(res, 400, 'Bad Request', 'El monto debe ser mayor a 0, con hasta 2 decimales.');
    if ((cleanConcept(body.concept) ?? '').length > 500) {
      return problem(res, 400, 'Bad Request', 'El concepto admite hasta 500 caracteres.');
    }
    const account = findAccount(req.params.id);
    if (!account) return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    postMovement(account, body.occurredOn, body.direction, body.amount, cleanConcept(body.concept), 'ADJUSTMENT', null);
    res.status(201).json(accountResource(findAccount(account.id)));
  });

  // Transfer: same order as the backend (origin looked up in the controller, then the service rules).
  server.post('/api/v1/bank-accounts/transfers', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (body.fromAccountId == null || body.toAccountId == null) {
      return problem(res, 400, 'Bad Request', 'Indica la cuenta de origen y la de destino.');
    }
    if (!ISO_DATE.test(body.transferredOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha no es válida.');
    if (!validAmount(body.amount)) return problem(res, 400, 'Bad Request', 'El monto debe ser mayor a 0, con hasta 2 decimales.');
    if ((cleanConcept(body.concept) ?? '').length > 500) {
      return problem(res, 400, 'Bad Request', 'El concepto admite hasta 500 caracteres.');
    }
    const from = findAccount(body.fromAccountId);
    if (!from) return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    if (Number(body.fromAccountId) === Number(body.toAccountId)) {
      return problem(res, 400, 'Bad Request', 'La cuenta de origen y la de destino deben ser distintas.');
    }
    const to = findAccount(body.toAccountId);
    if (!to) return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    if (from.currency !== to.currency) {
      return problem(res, 400, 'Bad Request', 'La moneda del monto debe coincidir con la de la cuenta.');
    }
    const concept = cleanConcept(body.concept);
    postMovement(from, body.transferredOn, 'OUTFLOW', body.amount, concept, 'TRANSFER', to.id);
    postMovement(findAccount(to.id), body.transferredOn, 'INFLOW', body.amount, concept, 'TRANSFER', from.id);
    res.status(201).json(accountResource(findAccount(from.id)));
  });

  // Anything else on /bank-accounts falls through to json-server: keep it behind the finance roles.
  server.use('/api/v1/bank-accounts', requireRoles(...READERS));

  // ---------- Payables ----------
  const payables = () => db.get('payables');
  const findPayable = (id) => payables().find({ id: Number(id) }).value();
  const PAYABLE_NOT_FOUND = 'Pago pendiente no encontrado.';
  const PAYABLE_PAID = 'El pago pendiente ya está pagado.';
  /** Stored record (with paidAmount) → PayableResource; balance and status like the backend `Payable`. */
  const payableResource = (record) => {
    const totalC = Math.round(record.totalAmount * 100);
    const paidC = Math.round(record.paidAmount * 100);
    const status = paidC === 0 ? 'PENDING' : paidC < totalC ? 'PARTIALLY_PAID' : 'PAID';
    return { ...record, paidAmount: paidC / 100, balance: (totalC - paidC) / 100, status };
  };

  // GET /payables?status= (optional), oldest first.
  server.get('/api/v1/payables', requireRoles(...READERS), (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !['PENDING', 'PARTIALLY_PAID', 'PAID'].includes(status)) {
      return problem(res, 400, 'Bad Request', 'Estado no válido.');
    }
    res.json(payables().sortBy('id').value().map(payableResource).filter((p) => !status || p.status === status));
  });

  server.get('/api/v1/payables/:id', requireRoles(...READERS), (req, res) => {
    const payable = findPayable(req.params.id);
    if (!payable) return problem(res, 404, 'Not Found', PAYABLE_NOT_FOUND);
    res.json(payableResource(payable));
  });

  // Payment: same order as PayableCommandService. It posts the outflow (with the backend concept, in English)
  // and, when it settles the payable of an expense, marks the expense as paid.
  server.post('/api/v1/payables/:id/payments', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.paidOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de pago no es válida.');
    if (!validAmount(body.amount)) return problem(res, 400, 'Bad Request', 'El monto del pago debe ser positivo.');
    if (body.bankAccountId == null) return problem(res, 400, 'Bad Request', 'Indica la cuenta de pago.');
    const record = findPayable(req.params.id);
    if (!record) return problem(res, 404, 'Not Found', PAYABLE_NOT_FOUND);
    const payable = payableResource(record);
    if (payable.status === 'PAID') return problem(res, 409, 'Conflict', PAYABLE_PAID);
    const account = findAccount(body.bankAccountId);
    if (!account) return problem(res, 404, 'Not Found', 'No se encontró la cuenta bancaria del pago.');
    if (account.currency !== payable.currency) {
      return problem(res, 400, 'Bad Request', 'La moneda del pago debe coincidir con la del pago pendiente y la cuenta.');
    }
    if (Math.round(body.amount * 100) > Math.round(payable.balance * 100)) {
      return problem(res, 409, 'Conflict', 'El pago supera el saldo del pago pendiente.');
    }
    const paidAmount = (Math.round(record.paidAmount * 100) + Math.round(body.amount * 100)) / 100;
    payables().find({ id: record.id }).assign({ paidAmount }).write();
    postMovement(account, body.paidOn, 'OUTFLOW', body.amount, `Payable payment: ${record.concept}`, 'PAYABLE_PAYMENT', null);
    const saved = payableResource(findPayable(record.id));
    if (saved.status === 'PAID' && saved.expenseId != null) {
      const expense = db.get('expenses').find({ id: saved.expenseId }).value();
      if (expense && !expense.annulled) {
        db.get('expenses').find({ id: expense.id }).assign({ paymentStatus: 'PAID' }).write();
      }
    }
    res.status(201).json(saved);
  });

  // PUT /payables/:id/schedule {year, month, week}: a week that does not exist in the month is a 400.
  server.put('/api/v1/payables/:id/schedule', requireRoles(...WRITERS), (req, res) => {
    const { year, month, week } = req.body ?? {};
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12
      || !Number.isInteger(week) || week < 1 || week > 6) {
      return problem(res, 400, 'Bad Request', 'La semana no es válida.');
    }
    if (!weekExists(year, month, week)) return problem(res, 400, 'Bad Request', `No existe la semana ${week} en ${year}-${String(month).padStart(2, '0')}.`);
    const record = findPayable(req.params.id);
    if (!record) return problem(res, 404, 'Not Found', PAYABLE_NOT_FOUND);
    if (payableResource(record).status === 'PAID') return problem(res, 409, 'Conflict', PAYABLE_PAID);
    payables().find({ id: record.id }).assign({ year, month, week }).write();
    res.json(payableResource(findPayable(record.id)));
  });
  // A payable by hand. Same order as the backend: @Valid fields (400), then the week (the controller builds the
  // CashFlowWeek: 400 if it does not exist), then the service rule (only PEN: 422). It starts pending.
  server.post('/api/v1/payables', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const concept = typeof body.concept === 'string' ? body.concept.trim() : '';
    const { year, month, week } = body;
    if (!concept || concept.length > 500) {
      return problem(res, 400, 'Bad Request', 'El concepto es obligatorio (hasta 500 caracteres).');
    }
    if (!PAYABLE_TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de pago pendiente no válido.');
    if (!validAmount(body.totalAmount)) return problem(res, 400, 'Bad Request', 'El monto total debe ser mayor a 0, con hasta 2 decimales.');
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12
      || !Number.isInteger(week) || week < 1 || week > 6) {
      return problem(res, 400, 'Bad Request', 'La semana no es válida.');
    }
    if (!weekExists(year, month, week)) {
      return problem(res, 400, 'Bad Request', `No existe la semana ${week} en ${year}-${String(month).padStart(2, '0')}.`);
    }
    if (body.currency !== 'PEN') {
      return problem(res, 422, 'Unprocessable Entity', 'Por ahora los importes solo pueden ser en PEN.');
    }
    const payable = {
      id: nextId('payables'),
      concept,
      type: body.type,
      totalAmount: body.totalAmount,
      currency: body.currency,
      paidAmount: 0,
      supplierId: body.supplierId == null ? null : Number(body.supplierId),
      projectId: body.projectId == null ? null : Number(body.projectId),
      expenseId: body.expenseId == null ? null : Number(body.expenseId),
      year,
      month,
      week,
    };
    payables().push(payable).write();
    res.status(201).json(payableResource(payable));
  });
  // Anything else on /payables stays behind the finance roles.
  server.use('/api/v1/payables', requireRoles(...READERS));

  // ---------- Loans ----------
  const loans = () => db.get('loans');
  const sumCents = (items, field) => items.reduce((sum, item) => sum + Math.round(item[field] * 100), 0);
  /** Stored loan → LoanResource: the total interest and the outstanding balance are derived like the backend `Loan`. */
  const loanResource = (loan) => {
    const paid = loan.installments.filter((installment) => installment.paid);
    return {
      ...loan,
      totalInterest: sumCents(loan.installments, 'interest') / 100,
      outstandingBalance: (Math.round(loan.principal * 100) - sumCents(paid, 'principal')) / 100,
    };
  };

  // GET /loans?type= (optional), oldest first.
  server.get('/api/v1/loans', requireRoles(...READERS), (req, res) => {
    const { type } = req.query;
    if (type !== undefined && !LOAN_TYPES.includes(type)) return problem(res, 400, 'Bad Request', 'Tipo de préstamo no válido.');
    res.json(loans().sortBy('id').value().filter((loan) => !type || loan.type === type).map(loanResource));
  });

  // Register: same order as the backend (@Valid fields 400, then the account 404, then its currency 400). It posts the
  // disbursement (an inflow when received, an outflow when granted) with the backend concept, in English, and the
  // loan starts pending without installments. The backend has no check of its own for USD.
  server.post('/api/v1/loans', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const counterparty = typeof body.counterparty === 'string' ? body.counterparty.trim() : '';
    if (!LOAN_TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de préstamo no válido.');
    if (!counterparty || counterparty.length > 200) {
      return problem(res, 400, 'Bad Request', 'La contraparte es obligatoria (hasta 200 caracteres).');
    }
    if (!validAmount(body.principal)) return problem(res, 400, 'Bad Request', 'El capital debe ser mayor a 0, con hasta 2 decimales.');
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (typeof body.interestRate !== 'number' || body.interestRate < 0) {
      return problem(res, 400, 'Bad Request', 'La tasa de interés no puede ser negativa.');
    }
    if (!ISO_DATE.test(body.disbursedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de desembolso no es válida.');
    if (body.bankAccountId == null) return problem(res, 400, 'Bad Request', 'Indica la cuenta del préstamo.');
    const account = findAccount(body.bankAccountId);
    if (!account) return problem(res, 404, 'Not Found', 'No se encontró la cuenta bancaria del préstamo.');
    if (account.currency !== body.currency) {
      return problem(res, 400, 'Bad Request', 'La moneda del préstamo debe coincidir con la de la cuenta bancaria.');
    }
    const loan = {
      id: nextId('loans'),
      type: body.type,
      counterparty,
      principal: body.principal,
      currency: body.currency,
      interestRate: Math.round(body.interestRate * 10000) / 10000,
      disbursedOn: body.disbursedOn,
      bankAccountId: account.id,
      status: 'PENDING',
      installments: [],
    };
    loans().push(loan).write();
    postMovement(
      account,
      loan.disbursedOn,
      loan.type === 'RECEIVED' ? 'INFLOW' : 'OUTFLOW',
      loan.principal,
      `Loan disbursement: ${loan.counterparty}`,
      'LOAN_DISBURSEMENT',
      loan.id,
    );
    res.status(201).json(loanResource(loan));
  });
  const LOAN_NOT_FOUND = 'Préstamo no encontrado.';
  const findLoan = (id) => loans().find({ id: Number(id) }).value();
  /** Installment ids are global, like the backend table. */
  const nextInstallmentId = () =>
    Math.max(0, ...loans().value().flatMap((loan) => loan.installments.map((installment) => installment.id))) + 1;
  /** >= 0 with at most 2 decimals and 12 integer digits (`@PositiveOrZero @Digits(integer = 12, fraction = 2)`). */
  const validCharge = (value) =>
    typeof value === 'number' && value >= 0 && value < 1e12 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

  server.get('/api/v1/loans/:id', requireRoles(...READERS), (req, res) => {
    const loan = findLoan(req.params.id);
    if (!loan) return problem(res, 404, 'Not Found', LOAN_NOT_FOUND);
    res.json(loanResource(loan));
  });

  // Schedule: @Valid body (400), the loan (404, looked up in the controller), then the capital of all the
  // installments against the loan's (409). It answers with the whole loan (201) and moves no cash.
  server.post('/api/v1/loans/:id/installments', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.dueOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de vencimiento no es válida.');
    if (!validAmount(body.principal)) {
      return problem(res, 400, 'Bad Request', 'El capital de la cuota debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (!validCharge(body.interest)) {
      return problem(res, 400, 'Bad Request', 'El interés no puede ser negativo y admite hasta 2 decimales.');
    }
    const loan = findLoan(req.params.id);
    if (!loan) return problem(res, 404, 'Not Found', LOAN_NOT_FOUND);
    if (sumCents(loan.installments, 'principal') + Math.round(body.principal * 100) > Math.round(loan.principal * 100)) {
      return problem(res, 409, 'Conflict', 'Las cuotas no pueden sumar más que el capital del préstamo.');
    }
    const installment = {
      id: nextInstallmentId(),
      dueOn: body.dueOn,
      principal: body.principal,
      interest: body.interest,
      paid: false,
      paidOn: null,
    };
    loans().find({ id: loan.id }).assign({ installments: [...loan.installments, installment] }).write();
    res.status(201).json(loanResource(findLoan(loan.id)));
  });

  // Pay a whole installment: @Valid body (400), loan and installment (404), already paid (409), account (404),
  // currency (400). The cash goes the other way than the disbursement, for capital plus interest, with the backend
  // concept in English; the loan becomes PARTIALLY_PAID, or PAID when nothing is left (200).
  server.post('/api/v1/loans/:id/installments/:installmentId/payments', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.paidOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de pago no es válida.');
    if (body.bankAccountId == null) return problem(res, 400, 'Bad Request', 'Indica la cuenta de pago.');
    const loan = findLoan(req.params.id);
    if (!loan) return problem(res, 404, 'Not Found', LOAN_NOT_FOUND);
    const installment = loan.installments.find((i) => i.id === Number(req.params.installmentId));
    if (!installment) return problem(res, 404, 'Not Found', 'Cuota no encontrada en ese préstamo.');
    if (installment.paid) return problem(res, 409, 'Conflict', 'La cuota ya está pagada.');
    const account = findAccount(body.bankAccountId);
    if (!account) return problem(res, 404, 'Not Found', 'No se encontró la cuenta bancaria del préstamo.');
    if (account.currency !== loan.currency) {
      return problem(res, 400, 'Bad Request', 'La moneda del préstamo debe coincidir con la de la cuenta bancaria.');
    }
    const installments = loan.installments.map((i) => (i.id === installment.id ? { ...i, paid: true, paidOn: body.paidOn } : i));
    const outstanding = loanResource({ ...loan, installments }).outstandingBalance;
    loans().find({ id: loan.id }).assign({ installments, status: outstanding > 0 ? 'PARTIALLY_PAID' : 'PAID' }).write();
    const total = (Math.round(installment.principal * 100) + Math.round(installment.interest * 100)) / 100;
    postMovement(
      account,
      body.paidOn,
      loan.type === 'RECEIVED' ? 'OUTFLOW' : 'INFLOW',
      total,
      `Loan installment: ${loan.counterparty}`,
      'LOAN_INSTALLMENT',
      installment.id,
    );
    res.json(loanResource(findLoan(loan.id)));
  });
  // Anything else on /loans stays behind the finance roles.
  server.use('/api/v1/loans', requireRoles(...READERS));

  // ---------- Partners and contributions ----------
  const partners = () => db.get('partners');
  const findPartner = (id) => partners().find({ id: Number(id) }).value();
  const PARTNER_NOT_FOUND = 'Socio no encontrado.';
  /** Stored partner → PartnerResource: the total adds every contribution as a plain number, like the backend. */
  const partnerResource = (partner) => ({
    id: partner.id,
    fullName: partner.fullName,
    role: partner.role ?? null,
    totalContributed: sumCents(partner.contributions ?? [], 'amount') / 100,
    contributions: partner.contributions ?? [],
  });
  /** Contribution ids are global, like the backend table. */
  const nextContributionId = () =>
    Math.max(0, ...partners().value().flatMap((partner) => (partner.contributions ?? []).map((c) => c.id))) + 1;
  const optionalText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

  server.get('/api/v1/partners', requireRoles(...READERS), (req, res) => {
    res.json(partners().sortBy('id').value().map(partnerResource));
  });

  server.get('/api/v1/partners/:id', requireRoles(...READERS), (req, res) => {
    const partner = findPartner(req.params.id);
    if (!partner) return problem(res, 404, 'Not Found', PARTNER_NOT_FOUND);
    res.json(partnerResource(partner));
  });

  // Register a partner: @Valid (name 1–200, role up to 100), then a name already in use (exact, after trimming) is a 409.
  server.post('/api/v1/partners', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const role = optionalText(body.role);
    if (!fullName || fullName.length > 200) {
      return problem(res, 400, 'Bad Request', 'El nombre es obligatorio (hasta 200 caracteres).');
    }
    if ((role ?? '').length > 100) return problem(res, 400, 'Bad Request', 'El cargo admite hasta 100 caracteres.');
    if (partners().find({ fullName }).value()) return problem(res, 409, 'Conflict', 'Ya existe un socio con ese nombre.');
    const partner = { id: nextId('partners'), fullName, role, contributions: [] };
    partners().push(partner).write();
    res.status(201).json(partnerResource(partner));
  });

  // Contribution: @Valid fields (400), the partner (404), only PEN (422), then the account when given (404). With an
  // account it posts a cash inflow there (concept in English, like the backend CashPostingEventHandler); without
  // one, or for an expense paid out of pocket, no cash moves. It answers with the whole partner (201).
  server.post('/api/v1/partners/:id/contributions', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.contributedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha del aporte no es válida.');
    if (!validAmount(body.amount)) return problem(res, 400, 'Bad Request', 'El monto del aporte debe ser mayor a 0, con hasta 2 decimales.');
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if ((optionalText(body.concept) ?? '').length > 500) {
      return problem(res, 400, 'Bad Request', 'El concepto admite hasta 500 caracteres.');
    }
    const partner = findPartner(req.params.id);
    if (!partner) return problem(res, 404, 'Not Found', PARTNER_NOT_FOUND);
    if (body.currency !== 'PEN') return problem(res, 422, 'Unprocessable Entity', 'Por ahora los importes solo pueden ser en PEN.');
    const account = body.bankAccountId == null ? null : findAccount(body.bankAccountId);
    if (body.bankAccountId != null && !account) {
      return problem(res, 404, 'Not Found', 'No se encontró la cuenta bancaria del aporte.');
    }
    const contribution = {
      id: nextContributionId(),
      contributedOn: body.contributedOn,
      amount: body.amount,
      currency: body.currency,
      reimbursable: body.reimbursable === true,
      bankAccountId: account ? account.id : null,
      expenseId: null,
      concept: optionalText(body.concept),
    };
    partners().find({ id: partner.id }).assign({ contributions: [...(partner.contributions ?? []), contribution] }).write();
    if (account) {
      postMovement(account, contribution.contributedOn, 'INFLOW', contribution.amount, 'Partner contribution',
        'PARTNER_CONTRIBUTION', contribution.id);
    }
    res.status(201).json(partnerResource(findPartner(partner.id)));
  });
  // Anything else on /partners stays behind the finance roles.
  server.use('/api/v1/partners', requireRoles(...READERS));
};
