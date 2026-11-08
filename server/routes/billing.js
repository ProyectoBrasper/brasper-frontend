// Billing fake routes: /invoices (read for any signed-in user). Issue, void, payments and scheduled
// collections are added with their screens. Responses have the exact shape of the backend InvoiceResource.

/** Stored record → InvoiceResource (drops the internal series / correlative / hasRetention / hasDetraction). */
const invoiceResource = ({ series, correlative, hasRetention, hasDetraction, ...invoice }) => invoice;

module.exports = (server, { db, problem, requireRoles }) => {
  const invoices = () => db.get('invoices');

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
};
