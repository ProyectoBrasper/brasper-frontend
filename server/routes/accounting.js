// Accounting fake routes: GET /tax-parameters?date= (rates in force on a date; 404 without body when
// none, like the backend) and the chart of accounts. Read: ADMIN, ACCOUNTING, MANAGEMENT; write: ADMIN,
// ACCOUNTING. Same rules, order of checks and Spanish messages as the backend. The rest comes with its screens.
const READERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_MANAGEMENT'];
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING'];
const LEDGER_ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const ACCOUNT_CODE = /^[1-9][0-9]{1,9}$/;

/** Parameters in force on `date` (yyyy-MM-dd): the latest with effectiveFrom <= date, or undefined. */
const taxParametersAt = (db, date) =>
  db
    .get('tax-parameters')
    .filter((p) => p.effectiveFrom <= date)
    .sortBy('effectiveFrom')
    .last()
    .value();

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const ledgerAccounts = () => db.get('ledger-accounts');
  /** By code as text, like the backend LedgerQueryService. */
  const byCode = (a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);

  server.get('/api/v1/ledger-accounts', requireRoles(...READERS), (req, res) => {
    res.json([...ledgerAccounts().value()].sort(byCode));
  });

  // Create: @Valid (code 2–10 digits starting with 1–9, name 1–200, type), then a code in use is a 409. It starts active.
  server.post('/api/v1/ledger-accounts', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!ACCOUNT_CODE.test(code)) {
      return problem(res, 400, 'Bad Request', 'El código debe tener de 2 a 10 dígitos y empezar con 1 a 9.');
    }
    if (!name || name.length > 200) return problem(res, 400, 'Bad Request', 'El nombre es obligatorio (hasta 200 caracteres).');
    if (!LEDGER_ACCOUNT_TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de cuenta no válido.');
    if (ledgerAccounts().find({ code }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe una cuenta contable con ese código.');
    }
    const account = { id: nextId('ledger-accounts'), code, name, type: body.type, active: true };
    ledgerAccounts().push(account).write();
    res.status(201).json(account);
  });
  server.use('/api/v1/ledger-accounts', requireRoles(...READERS));

  server.get('/api/v1/tax-parameters', requireRoles(...READERS), (req, res) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? '') ? req.query.date : new Date().toISOString().slice(0, 10);
    const parameters = taxParametersAt(db, date);
    if (!parameters) return res.status(404).end();
    res.json(parameters);
  });
};

module.exports.taxParametersAt = taxParametersAt;
