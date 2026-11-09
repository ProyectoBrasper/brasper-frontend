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
};
