// Accounting fake routes: GET /tax-parameters?date= (rates in force on a date; 404 without body when
// none, like the backend), the chart of accounts, the journal entries (list by month, manual entry, reversal), the trial balance and the tax returns. Read: ADMIN, ACCOUNTING, MANAGEMENT; write: ADMIN,
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

  // Manual entry, in the backend order: @Valid body (400), then the double-entry rules of JournalEntry (at least two
  // lines, one side per line, one currency, debit = credit: 400), then the accounts (missing 404, inactive 400). 201.
  const INVALID_ENTRY = 'El asiento necesita al menos dos líneas, un lado por línea, y debe cuadrar.';
  const validMoney = (money) =>
    money && typeof money.amount === 'number' && money.amount >= 0 && money.amount < 1e12
    && Math.abs(money.amount * 100 - Math.round(money.amount * 100)) < 1e-6 && ['PEN', 'USD'].includes(money.currency);
  server.post('/api/v1/journal-entries', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!ISO_DATE.test(body.entryDate ?? '')) return problem(res, 400, 'Bad Request', 'La fecha del asiento no es válida.');
    if (!description || description.length > 300) {
      return problem(res, 400, 'Bad Request', 'La descripción es obligatoria (hasta 300 caracteres).');
    }
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) return problem(res, 400, 'Bad Request', 'El asiento necesita líneas.');
    for (const line of lines) {
      if (!line || !ACCOUNT_CODE.test(line.accountCode ?? '') || !validMoney(line.debit) || !validMoney(line.credit)) {
        return problem(res, 400, 'Bad Request', 'Cada línea necesita una cuenta válida y montos de 0 o más, con hasta 2 decimales.');
      }
    }
    const currency = lines[0].debit.currency;
    const oneSide = (line) => (line.debit.amount > 0) !== (line.credit.amount > 0);
    const sameCurrency = (line) => line.debit.currency === currency && line.credit.currency === currency;
    const cents = (side) => lines.reduce((sum, line) => sum + Math.round(line[side].amount * 100), 0);
    if (lines.length < 2 || !lines.every(oneSide) || !lines.every(sameCurrency) || cents('debit') !== cents('credit')) {
      return problem(res, 400, 'Bad Request', INVALID_ENTRY);
    }
    const accounts = lines.map((line) => ledgerAccounts().find({ code: line.accountCode }).value());
    if (accounts.some((account) => !account)) return problem(res, 404, 'Not Found', 'Una cuenta contable del asiento no existe.');
    if (accounts.some((account) => !account.active)) {
      return problem(res, 400, 'Bad Request', 'Una cuenta contable del asiento está inactiva.');
    }
    const entry = {
      id: nextId('journal-entries'),
      entryDate: body.entryDate,
      description,
      source: 'MANUAL',
      sourceId: null,
      reversed: false,
      reversalOfId: null,
      lines: lines.map((line) => ({
        accountCode: line.accountCode,
        debit: line.debit.amount,
        credit: line.credit.amount,
        projectId: line.projectId == null ? null : Number(line.projectId),
      })),
    };
    entries().push(entry).write();
    res.status(201).json(entryResource(entry));
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

  // GET /ledger-accounts/trial-balance?year=&month= (both required): like LedgerQueryService.trialBalance, the debit and
  // credit each account moved in that month (reversed entries and reversals included), only accounts with movements,
  // by "code|currency"; the name comes from the chart (the code when the account is not in it). No totals.
  server.get('/api/v1/ledger-accounts/trial-balance', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    }
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const totals = new Map();
    for (const entry of entries().filter((e) => e.entryDate.startsWith(prefix)).value()) {
      for (const line of entry.lines) {
        const key = `${line.accountCode}|PEN`;
        const total = totals.get(key) ?? { accountCode: line.accountCode, debit: 0, credit: 0 };
        total.debit += Math.round(line.debit * 100);
        total.credit += Math.round(line.credit * 100);
        totals.set(key, total);
      }
    }
    const names = new Map(ledgerAccounts().value().map((account) => [account.code, account.name]));
    const lines = [...totals.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, total]) => ({
        accountCode: total.accountCode,
        accountName: names.get(total.accountCode) ?? total.accountCode,
        debit: money(total.debit),
        credit: money(total.credit),
      }));
    res.json({ year, month, lines });
  });

  // ---------- Tax returns ----------
  // Stored: { id, year, month, outputIgv, inputIgv, carriedCredit, incomeTaxPrepayment, currency, status, paidOn,
  // bankAccountId }; the resource adds igvPayable and totalPayable like the backend TaxReturn.
  const returns = () => db.get('tax-returns');
  const cents = (amount) => Math.round(amount * 100);
  const igvPayableCents = (r) => Math.max(0, cents(r.outputIgv) - cents(r.inputIgv) - cents(r.carriedCredit));
  const nextCarriedCreditCents = (r) => Math.max(0, cents(r.inputIgv) + cents(r.carriedCredit) - cents(r.outputIgv));
  const returnResource = (r) => {
    const igv = igvPayableCents(r);
    return {
      id: r.id,
      year: r.year,
      month: r.month,
      outputIgv: money(cents(r.outputIgv)),
      inputIgv: money(cents(r.inputIgv)),
      carriedCredit: money(cents(r.carriedCredit)),
      igvPayable: money(igv),
      incomeTaxPrepayment: money(cents(r.incomeTaxPrepayment)),
      totalPayable: money(igv + cents(r.incomeTaxPrepayment)),
      status: r.status,
      paidOn: r.paidOn ?? null,
      bankAccountId: r.bankAccountId ?? null,
    };
  };
  const latestFirst = (a, b) => b.year - a.year || b.month - a.month;

  server.get('/api/v1/tax-returns/history', requireRoles(...READERS), (req, res) => {
    res.json([...returns().value()].sort(latestFirst).map(returnResource));
  });

  server.get('/api/v1/tax-returns', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    }
    const found = returns().find({ year, month }).value();
    if (!found) return problem(res, 404, 'Not Found', 'No se encontró la declaración de impuestos.');
    res.json(returnResource(found));
  });

  // Prepare, like TaxCommandService: a month already prepared is a 409. Output and input IGV are the credit and debit
  // of 40111 in the month, sales the credit minus debit of 70; the carried credit is what the previous return left;
  // the prepayment is the sales times the rate in force at the end of the month (1.5 % without parameters). Draft.
  server.post('/api/v1/tax-returns', requireRoles(...WRITERS), (req, res) => {
    const { year, month } = req.body ?? {};
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'El año (2000–2100) y el mes (1–12) son obligatorios.');
    }
    if (returns().find({ year, month }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe una declaración de impuestos para este periodo.');
    }
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    let output = 0;
    let input = 0;
    let sales = 0;
    for (const entry of entries().filter((e) => e.entryDate.startsWith(prefix)).value()) {
      for (const line of entry.lines) {
        if (line.accountCode === '40111') {
          output += cents(line.credit);
          input += cents(line.debit);
        } else if (line.accountCode === '70') {
          sales += cents(line.credit) - cents(line.debit);
        }
      }
    }
    const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const before = returns().find(previous).value();
    const carried = before ? nextCarriedCreditCents(before) : 0;
    const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const rate = taxParametersAt(db, monthEnd)?.incomeTaxPrepayment ?? 0.015;
    const prepayment = sales > 0 ? Math.round(sales * rate) : 0;
    const taxReturn = {
      id: nextId('tax-returns'),
      year,
      month,
      outputIgv: output / 100,
      inputIgv: input / 100,
      carriedCredit: carried / 100,
      incomeTaxPrepayment: prepayment / 100,
      currency: 'PEN',
      status: 'DRAFT',
      paidOn: null,
      bankAccountId: null,
    };
    returns().push(taxReturn).write();
    res.status(201).json(returnResource(taxReturn));
  });

  // Pay: @Valid (400), the return (404), already paid (409), the account (400). Filed and paid at once; with
  // something to pay it posts the entry (D 40111 IGV, D 4017 prepayment, H 10 total, TAX_RETURN) and the cash
  // outflow "Tax return payment" (TAX_PAYMENT), like CashPostingEventHandler. 200.
  server.post('/api/v1/tax-returns/:id/payment', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    if (!ISO_DATE.test(body.paidOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de pago no es válida.');
    if (body.bankAccountId == null) return problem(res, 400, 'Bad Request', 'Indica la cuenta de pago.');
    const taxReturn = returns().find({ id: Number(req.params.id) }).value();
    if (!taxReturn) return problem(res, 404, 'Not Found', 'No se encontró la declaración de impuestos.');
    if (taxReturn.status === 'PAID') return problem(res, 409, 'Conflict', 'La declaración de impuestos ya está pagada.');
    const account = db.get('bank-accounts').find({ id: Number(body.bankAccountId) }).value();
    if (!account) return problem(res, 400, 'Bad Request', 'No se encontró la cuenta bancaria.');
    const igv = igvPayableCents(taxReturn);
    const prepayment = cents(taxReturn.incomeTaxPrepayment);
    const total = igv + prepayment;
    if (total > 0) {
      const lines = [];
      if (igv > 0) lines.push({ accountCode: '40111', debit: igv / 100, credit: 0, projectId: null });
      if (prepayment > 0) lines.push({ accountCode: '4017', debit: prepayment / 100, credit: 0, projectId: null });
      lines.push({ accountCode: '10', debit: 0, credit: total / 100, projectId: null });
      entries().push({
        id: nextId('journal-entries'),
        entryDate: body.paidOn,
        description: `IGV and income tax prepayment ${taxReturn.year}-${String(taxReturn.month).padStart(2, '0')}`,
        source: 'TAX_RETURN',
        sourceId: taxReturn.id,
        reversed: false,
        reversalOfId: null,
        lines,
      }).write();
      db.get('cash-movements').push({
        id: nextId('cash-movements'),
        bankAccountId: account.id,
        occurredOn: body.paidOn,
        direction: 'OUTFLOW',
        amount: total / 100,
        concept: 'Tax return payment',
        source: 'TAX_PAYMENT',
        sourceId: taxReturn.id,
      }).write();
      db.get('bank-accounts').find({ id: account.id }).assign({ currentBalance: (cents(account.currentBalance) - total) / 100 }).write();
    }
    returns().find({ id: taxReturn.id }).assign({ status: 'PAID', paidOn: body.paidOn, bankAccountId: account.id }).write();
    res.json(returnResource(returns().find({ id: taxReturn.id }).value()));
  });
  server.use('/api/v1/tax-returns', requireRoles(...READERS));

  server.get('/api/v1/tax-parameters', requireRoles(...READERS), (req, res) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? '') ? req.query.date : new Date().toISOString().slice(0, 10);
    const parameters = taxParametersAt(db, date);
    if (!parameters) return res.status(404).end();
    res.json(parameters);
  });
};

module.exports.taxParametersAt = taxParametersAt;
