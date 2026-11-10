// Accounting fake routes: GET /tax-parameters?date= (rates in force on a date; 404 without body when
// none, like the backend), the chart of accounts and the journal entries (list by month, reversal). Read: ADMIN, ACCOUNTING, MANAGEMENT; write: ADMIN,
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

  // ---------- Journal entries ----------
  // Stored: { id, entryDate, description, source, sourceId, reversed, reversalOfId, lines: [{ accountCode, debit,
  // credit, projectId }] } in PEN. The resource adds the period, the totals and the MoneyResources, like the backend.
  // The fake API does not post the automatic entries of the other modules: only the seed has them.
  const entries = () => db.get('journal-entries');
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const money = (cents) => ({ amount: cents / 100, currency: 'PEN' });
  const entryResource = (entry) => {
    const debit = entry.lines.reduce((sum, line) => sum + Math.round(line.debit * 100), 0);
    const credit = entry.lines.reduce((sum, line) => sum + Math.round(line.credit * 100), 0);
    return {
      id: entry.id,
      entryDate: entry.entryDate,
      year: Number(entry.entryDate.slice(0, 4)),
      month: Number(entry.entryDate.slice(5, 7)),
      description: entry.description,
      source: entry.source,
      sourceId: entry.sourceId ?? null,
      reversed: entry.reversed === true,
      reversalOfId: entry.reversalOfId ?? null,
      totalDebit: money(debit),
      totalCredit: money(credit),
      lines: entry.lines.map((line) => ({
        accountCode: line.accountCode,
        debit: money(Math.round(line.debit * 100)),
        credit: money(Math.round(line.credit * 100)),
        projectId: line.projectId ?? null,
      })),
    };
  };
  /** By date, then by id (backend findAllByPeriodYearAndPeriodMonthOrderByEntryDateAscIdAsc). */
  const byDateAndId = (a, b) => a.entryDate.localeCompare(b.entryDate) || a.id - b.id;

  // GET /journal-entries?year=&month= (both required, like the backend @RequestParam int).
  server.get('/api/v1/journal-entries', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    }
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    res.json(entries().filter((e) => e.entryDate.startsWith(prefix)).value().sort(byDateAndId).map(entryResource));
  });

  server.get('/api/v1/journal-entries/:id', requireRoles(...READERS), (req, res) => {
    const entry = entries().find({ id: Number(req.params.id) }).value();
    if (!entry) return problem(res, 404, 'Not Found', 'Asiento no encontrado.');
    res.json(entryResource(entry));
  });

  // Reversal: @Valid date (400), the entry (404), a reversal or a reversed entry (409). It posts a new entry on that
  // date with the lines swapped (description in English, like JournalEntry.reverse) and answers with it (201).
  server.post('/api/v1/journal-entries/:id/reversal', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.reversedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de la reversa no es válida.');
    const entry = entries().find({ id: Number(req.params.id) }).value();
    if (!entry) return problem(res, 404, 'Not Found', 'Asiento no encontrado.');
    if (entry.reversed || entry.source === 'REVERSAL') {
      return problem(res, 409, 'Conflict', 'El asiento ya está revertido o es una reversa.');
    }
    const reversal = {
      id: nextId('journal-entries'),
      entryDate: body.reversedOn,
      description: `Reversal of: ${entry.description}`.slice(0, 300),
      source: 'REVERSAL',
      sourceId: entry.id,
      reversed: false,
      reversalOfId: entry.id,
      lines: entry.lines.map((line) => ({ accountCode: line.accountCode, debit: line.credit, credit: line.debit, projectId: line.projectId ?? null })),
    };
    entries().find({ id: entry.id }).assign({ reversed: true }).write();
    entries().push(reversal).write();
    res.status(201).json(entryResource(reversal));
  });
  server.use('/api/v1/journal-entries', requireRoles(...READERS));

  server.get('/api/v1/tax-parameters', requireRoles(...READERS), (req, res) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? '') ? req.query.date : new Date().toISOString().slice(0, 10);
    const parameters = taxParametersAt(db, date);
    if (!parameters) return res.status(404).end();
    res.json(parameters);
  });
};

module.exports.taxParametersAt = taxParametersAt;
