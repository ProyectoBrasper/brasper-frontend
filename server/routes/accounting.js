// Accounting fake routes: GET /tax-parameters?date= (rates in force on a date; 404 without body when
// none, like the backend). Read: ADMIN, ACCOUNTING, MANAGEMENT. The rest comes with its screens.
const READERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_MANAGEMENT'];

/** Parameters in force on `date` (yyyy-MM-dd): the latest with effectiveFrom <= date, or undefined. */
const taxParametersAt = (db, date) =>
  db
    .get('tax-parameters')
    .filter((p) => p.effectiveFrom <= date)
    .sortBy('effectiveFrom')
    .last()
    .value();

module.exports = (server, { db, requireRoles }) => {
  server.get('/api/v1/tax-parameters', requireRoles(...READERS), (req, res) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? '') ? req.query.date : new Date().toISOString().slice(0, 10);
    const parameters = taxParametersAt(db, date);
    if (!parameters) return res.status(404).end();
    res.json(parameters);
  });
};

module.exports.taxParametersAt = taxParametersAt;
