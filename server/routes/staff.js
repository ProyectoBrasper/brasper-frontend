// Staff fake routes. Salaries are sensitive: ADMIN, ACCOUNTING and MANAGEMENT read; ADMIN and ACCOUNTING write,
// like the backend. Same rules, statuses and Spanish messages as the backend (messages_es.properties).
const READERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_MANAGEMENT'];
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** > 0 with at most 2 decimals and 12 integer digits (`@Positive @Digits(integer = 12, fraction = 2)`). */
const validAmount = (value) =>
  typeof value === 'number' && value > 0 && value < 1e12 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const employees = () => db.get('employees');
  const findEmployee = (req) => employees().find({ id: Number(req.params.id) }).value();
  const NOT_FOUND = 'Empleado no encontrado.';

  // GET /employees?active=true|false (optional).
  server.get('/api/v1/employees', requireRoles(...READERS), (req, res) => {
    const { active } = req.query;
    const result = employees()
      .filter((e) => active === undefined || e.active === (active === 'true'))
      .sortBy('fullName')
      .value();
    res.json(result);
  });

  server.get('/api/v1/employees/:id', requireRoles(...READERS), (req, res) => {
    const employee = findEmployee(req);
    if (!employee) return problem(res, 404, 'Not Found', NOT_FOUND);
    res.json(employee);
  });

  server.post('/api/v1/employees', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const position = typeof body.position === 'string' ? body.position.trim() : '';
    if (!fullName || fullName.length > 200) {
      return problem(res, 400, 'Bad Request', 'El nombre es obligatorio (hasta 200 caracteres).');
    }
    if (!/^\d{8}$/.test(body.dni ?? '')) return problem(res, 400, 'Bad Request', 'El DNI debe tener 8 dígitos.');
    if (position.length > 100) return problem(res, 400, 'Bad Request', 'El cargo admite hasta 100 caracteres.');
    if (!validAmount(body.monthlySalary)) {
      return problem(res, 400, 'Bad Request', 'El sueldo debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (!ISO_DATE.test(body.hiredOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de ingreso no es válida.');
    if (employees().find({ dni: body.dni }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe un empleado con ese DNI.');
    }
    const employee = {
      id: nextId('employees'),
      fullName,
      dni: body.dni,
      position: position || null,
      monthlySalary: body.monthlySalary,
      currency: body.currency,
      hiredOn: body.hiredOn,
      terminatedOn: null,
      active: true,
    };
    employees().push(employee).write();
    res.status(201).json(employee);
  });

  // Like the backend's UpdateEmployeeResource: only the position and the salary change.
  server.put('/api/v1/employees/:id', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const position = typeof body.position === 'string' ? body.position.trim() : '';
    if (position.length > 100) return problem(res, 400, 'Bad Request', 'El cargo admite hasta 100 caracteres.');
    if (!validAmount(body.monthlySalary)) {
      return problem(res, 400, 'Bad Request', 'El sueldo debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    const employee = findEmployee(req);
    if (!employee) return problem(res, 404, 'Not Found', NOT_FOUND);
    if (!employee.active) return problem(res, 409, 'Conflict', 'El empleado ya está dado de baja.');
    employees()
      .find({ id: employee.id })
      .assign({ position: position || null, monthlySalary: body.monthlySalary, currency: body.currency })
      .write();
    res.json(findEmployee(req));
  });

  server.post('/api/v1/employees/:id/termination', requireRoles(...WRITERS), (req, res) => {
    const terminatedOn = req.body?.terminatedOn;
    if (!ISO_DATE.test(terminatedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de baja no es válida.');
    const employee = findEmployee(req);
    if (!employee) return problem(res, 404, 'Not Found', NOT_FOUND);
    if (!employee.active) return problem(res, 409, 'Conflict', 'El empleado ya está dado de baja.');
    if (terminatedOn < employee.hiredOn) {
      return problem(res, 400, 'Bad Request', 'La fecha de baja no puede ser anterior a la fecha de contratación.');
    }
    employees().find({ id: employee.id }).assign({ terminatedOn, active: false }).write();
    res.json(findEmployee(req));
  });

  // ---------- Fixed costs and their monthly payments ----------
  const costs = () => db.get('fixed-costs');
  const payments = () => db.get('fixed-cost-payments');
  const findCost = (req) => costs().find({ id: Number(req.params.id) }).value();
  const COST_NOT_FOUND = 'Costo fijo no encontrado.';
  const INACTIVE = 'El costo fijo está inactivo.';
  const TYPES = ['SALARY', 'OVERTIME', 'ACCOUNTING', 'SCTR_INSURANCE', 'LIFE_INSURANCE', 'OFFICE_RENT', 'CLEANING',
    'BANK_FEES', 'ITF', 'HOSTING', 'ADMINISTRATIVE'];
  /** Null/absent = no weeks; otherwise unique integers 1 to 5 (backend `PaymentSchedule`). */
  const validWeeks = (weeks) =>
    weeks == null ||
    (Array.isArray(weeks) && weeks.every((w) => Number.isInteger(w) && w >= 1 && w <= 5) && new Set(weeks).size === weeks.length);
  const concept = (body) => (typeof body.concept === 'string' ? body.concept.trim() : '');

  // GET /fixed-costs/payments?year=&month= (both required). Must be declared before /fixed-costs/:id.
  server.get('/api/v1/fixed-costs/payments', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    }
    res.json(payments().filter({ year, month }).sortBy('paidOn').value());
  });

  server.get('/api/v1/fixed-costs', requireRoles(...READERS), (req, res) => {
    const { active } = req.query;
    res.json(costs().filter((c) => active === undefined || c.active === (active === 'true')).sortBy('code').value());
  });

  server.get('/api/v1/fixed-costs/:id', requireRoles(...READERS), (req, res) => {
    const cost = findCost(req);
    if (!cost) return problem(res, 404, 'Not Found', COST_NOT_FOUND);
    res.json(cost);
  });

  server.post('/api/v1/fixed-costs', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code || code.length > 30) return problem(res, 400, 'Bad Request', 'El código debe tener de 1 a 30 caracteres.');
    if (!concept(body) || concept(body).length > 500) {
      return problem(res, 400, 'Bad Request', 'El concepto es obligatorio (hasta 500 caracteres).');
    }
    if (!TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de costo fijo no válido.');
    if (!validAmount(body.monthlyAmount)) {
      return problem(res, 400, 'Bad Request', 'El monto mensual debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (!validWeeks(body.expectedWeeks)) {
      return problem(res, 400, 'Bad Request', 'Las semanas esperadas deben ser únicas y estar entre 1 y 5.');
    }
    // Same order as FixedCostCommandService.
    if (body.currency !== 'PEN') {
      return problem(res, 422, 'Unprocessable Entity', 'Por ahora los costos fijos solo pueden ser en PEN.');
    }
    if (costs().find({ code }).value()) return problem(res, 409, 'Conflict', 'Ya existe un costo fijo con ese código.');
    const employeeId = body.employeeId ?? null;
    if (body.type === 'SALARY' && employeeId === null) {
      return problem(res, 400, 'Bad Request', 'Un costo fijo de sueldo necesita al empleado.');
    }
    if (employeeId !== null && !employees().find({ id: Number(employeeId) }).value()) {
      return problem(res, 404, 'Not Found', NOT_FOUND);
    }
    const cost = {
      id: nextId('fixed-costs'),
      code,
      concept: concept(body),
      type: body.type,
      monthlyAmount: body.monthlyAmount,
      currency: body.currency,
      employeeId: employeeId === null ? null : Number(employeeId),
      expectedWeeks: body.expectedWeeks ?? [],
      active: true,
    };
    costs().push(cost).write();
    res.status(201).json(cost);
  });

  // Like the backend's UpdateFixedCostResource: concept, amount and weeks (currency, code, type, employee stay).
  server.put('/api/v1/fixed-costs/:id', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!concept(body) || concept(body).length > 500) {
      return problem(res, 400, 'Bad Request', 'El concepto es obligatorio (hasta 500 caracteres).');
    }
    if (!validAmount(body.monthlyAmount)) {
      return problem(res, 400, 'Bad Request', 'El monto mensual debe ser mayor a 0, con hasta 2 decimales.');
    }
    if (!validWeeks(body.expectedWeeks)) {
      return problem(res, 400, 'Bad Request', 'Las semanas esperadas deben ser únicas y estar entre 1 y 5.');
    }
    const cost = findCost(req);
    if (!cost) return problem(res, 404, 'Not Found', COST_NOT_FOUND);
    if (!cost.active) return problem(res, 409, 'Conflict', INACTIVE);
    costs()
      .find({ id: cost.id })
      .assign({ concept: concept(body), monthlyAmount: body.monthlyAmount, expectedWeeks: body.expectedWeeks ?? [] })
      .write();
    res.json(findCost(req));
  });

  // Deactivating cannot be undone; deactivating an inactive cost is harmless (like the backend).
  server.post('/api/v1/fixed-costs/:id/deactivate', requireRoles(...WRITERS), (req, res) => {
    const cost = findCost(req);
    if (!cost) return problem(res, 404, 'Not Found', COST_NOT_FOUND);
    costs().find({ id: cost.id }).assign({ active: false }).write();
    res.json(findCost(req));
  });

  server.post('/api/v1/fixed-costs/:id/payments', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const year = Number(body.year);
    const month = Number(body.month);
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (!ISO_DATE.test(body.paidOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de pago no es válida.');
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'El período no es válido.');
    }
    if (!validAmount(body.amount)) return problem(res, 400, 'Bad Request', 'El monto debe ser mayor a 0, con hasta 2 decimales.');
    if (notes.length > 500) return problem(res, 400, 'Bad Request', 'Las notas admiten hasta 500 caracteres.');
    const cost = findCost(req);
    if (!cost) return problem(res, 404, 'Not Found', COST_NOT_FOUND);
    if (!cost.active) return problem(res, 409, 'Conflict', INACTIVE);
    const bankAccountId = body.bankAccountId ?? null;
    if (bankAccountId !== null && !db.get('bank-accounts').find({ id: Number(bankAccountId) }).value()) {
      return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    }
    const payment = {
      id: nextId('fixed-cost-payments'),
      fixedCostId: cost.id,
      paidOn: body.paidOn,
      year,
      month,
      amount: body.amount,
      currency: cost.currency,
      bankAccountId: bankAccountId === null ? null : Number(bankAccountId),
      notes: notes || null,
    };
    payments().push(payment).write();
    res.status(201).json(payment);
  });
};
