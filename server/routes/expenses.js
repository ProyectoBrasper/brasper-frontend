// Expenses fake routes. Any signed-in user reads; writes need ADMIN, ACCOUNTING or ENGINEER (management is
// read-only), like the backend. Messages mirror the backend's. Register / correct and the supplier writes are
// added with their screens.
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];
const CATEGORIES = ['MATERIALS', 'LABOR', 'TRAVEL_EXPENSES', 'OTHER'];

module.exports = (server, { db, problem, requireRoles }) => {
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

  server.get('/api/v1/suppliers/:id', requireRoles(), (req, res) => {
    const supplier = suppliers().find({ id: Number(req.params.id) }).value();
    if (!supplier) return problem(res, 404, 'Not Found', 'Proveedor no encontrado.');
    res.json(supplier);
  });
};
