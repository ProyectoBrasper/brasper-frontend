// Expenses fake routes. Any signed-in user reads; writes need ADMIN, ACCOUNTING or ENGINEER (management is
// read-only), like the backend. Messages mirror the backend's. Register / correct are added with the expense form.
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];
const CATEGORIES = ['MATERIALS', 'LABOR', 'TRAVEL_EXPENSES', 'OTHER'];
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
