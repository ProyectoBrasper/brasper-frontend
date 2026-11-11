// Reporting fake routes. Read: ADMIN, MANAGEMENT, ACCOUNTING. Like the backend, the reports are calculated from what the
// other modules stored. The rest comes with its screens.
const { weeksOf, weekOf, weekContaining } = require('./cash-flow-week');
const { taxParametersAt } = require('./accounting');

const READERS = ['ROLE_ADMIN', 'ROLE_MANAGEMENT', 'ROLE_ACCOUNTING'];

const cents = (amount) => Math.round(amount * 100);
const todayInLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const shiftDay = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const previousDay = (iso) => shiftDay(iso, -1);
const MAX_WEEKS = 52;
const MAX_MONTHS = 24;
const add = (flows, concept, amount) => {
  if (amount) flows[concept] = (flows[concept] ?? 0) + amount;
};
const sameWeek = (a, week) => a.year === week.year && a.month === week.month && a.week === week.number;

/** ReportingFacadeCashFlowSource.inflowConcept and outflowConcept. */
const INFLOWS = { INVOICE_PAYMENT: 'INVOICE_COLLECTIONS', LOAN_DISBURSEMENT: 'LOANS', PARTNER_CONTRIBUTION: 'PARTNER_CONTRIBUTIONS' };
const OUTFLOWS = { EXPENSE: 'SUPPLIERS', PAYABLE_PAYMENT: 'PENDING_PAYABLES', LOAN_INSTALLMENT: 'LOAN_REPAYMENTS', TAX_PAYMENT: 'TAXES' };
/** ReportingFacadeCashFlowSource.addFixedCosts. */
const FIXED_COSTS = {
  SALARY: 'PAYROLL',
  OVERTIME: 'PAYROLL',
  OFFICE_RENT: 'OFFICE_RENT',
  CLEANING: 'CLEANING',
  SCTR_INSURANCE: 'INSURANCE',
  LIFE_INSURANCE: 'INSURANCE',
};
const fixedCostConcept = (type) => FIXED_COSTS[type] ?? 'OTHER_EXPENSES';

module.exports = (server, { db, problem, requireRoles }) => {
  const movements = () => db.get('cash-movements').value();

  /** Real cash at the end of a date: today's balances minus what moved after it. */
  const cashBalanceAt = (date) => {
    const current = db.get('bank-accounts').value().reduce((sum, account) => sum + cents(account.currentBalance), 0);
    return movements()
      .filter((m) => m.occurredOn > date)
      .reduce((sum, m) => sum - (m.direction === 'INFLOW' ? 1 : -1) * cents(m.amount), current);
  };

  const inWeek = (date, week) => date >= week.startDate && date <= week.endDate;

  const actualInflows = (week) => {
    const flows = {};
    for (const m of movements()) {
      if (m.direction === 'INFLOW' && inWeek(m.occurredOn, week)) add(flows, INFLOWS[m.source] ?? 'OTHER_INCOME', cents(m.amount));
    }
    return flows;
  };

  /** The movements of fixed costs are left out: their payments carry the cost type the movements lack. */
  const actualOutflows = (week) => {
    const flows = {};
    for (const m of movements()) {
      if (m.direction === 'OUTFLOW' && m.source !== 'FIXED_COST_PAYMENT' && inWeek(m.occurredOn, week)) {
        add(flows, OUTFLOWS[m.source] ?? 'OTHER_EXPENSES', cents(m.amount));
      }
    }
    const costs = db.get('fixed-costs').value();
    for (const payment of db.get('fixed-cost-payments').value()) {
      if (inWeek(payment.paidOn, week)) {
        add(flows, fixedCostConcept(costs.find((cost) => cost.id === payment.fixedCostId)?.type), cents(payment.amount));
      }
    }
    return flows;
  };

  /** Unpaid installments due in the week, by loan type, capital plus interest. */
  const scheduledInstallments = (week, type) => {
    let total = 0;
    for (const loan of db.get('loans').value()) {
      if (loan.type !== type) continue;
      for (const installment of loan.installments) {
        if (!installment.paid && sameWeek(weekOf(installment.dueOn), week)) {
          total += cents(installment.principal) + cents(installment.interest);
        }
      }
    }
    return total;
  };

  const projectedInflows = (week) => {
    const flows = {};
    let collections = 0;
    for (const collection of db.get('scheduled-collections').value()) {
      const open = collection.status === 'SCHEDULED' || collection.status === 'RESCHEDULED';
      if (open && sameWeek(collection, week)) collections += cents(collection.expectedAmount);
    }
    add(flows, 'INVOICE_COLLECTIONS', collections);
    add(flows, 'OTHER_INCOME', scheduledInstallments(week, 'GRANTED'));
    return flows;
  };

  /** A fixed cost splits its monthly amount across its expected weeks while the month is not fully paid. */
  const scheduledFixedCosts = (flows, week) => {
    const payments = db.get('fixed-cost-payments').value();
    for (const cost of db.get('fixed-costs').value()) {
      if (!cost.active || !cost.expectedWeeks.includes(week.number)) continue;
      const paid = payments
        .filter((p) => p.fixedCostId === cost.id && p.year === week.year && p.month === week.month)
        .reduce((sum, p) => sum + cents(p.amount), 0);
      if (cents(cost.monthlyAmount) > paid) {
        add(flows, fixedCostConcept(cost.type), Math.round(cents(cost.monthlyAmount) / cost.expectedWeeks.length));
      }
    }
  };

  const projectedOutflows = (week) => {
    const flows = {};
    let payables = 0;
    for (const payable of db.get('payables').value()) {
      const balance = cents(payable.totalAmount) - cents(payable.paidAmount);
      if (balance > 0 && sameWeek(payable, week)) payables += balance;
    }
    add(flows, 'PENDING_PAYABLES', payables);
    add(flows, 'LOAN_REPAYMENTS', scheduledInstallments(week, 'RECEIVED'));
    scheduledFixedCosts(flows, week);
    return flows;
  };

  const merge = (a, b) => {
    const total = { ...a };
    for (const [concept, amount] of Object.entries(b)) add(total, concept, amount);
    return total;
  };

  /** CashFlowCalculator.weekLine, in cents: a past week is real, a later one scheduled, the week of today both. */
  const weekLine = (week, opening, today) => {
    const projected = week.endDate >= today;
    const current = projected && week.startDate <= today;
    let inflows = projected ? projectedInflows(week) : actualInflows(week);
    let outflows = projected ? projectedOutflows(week) : actualOutflows(week);
    if (current) {
      inflows = merge(actualInflows(week), inflows);
      outflows = merge(actualOutflows(week), outflows);
    }
    const label = `${week.year}-${String(week.month).padStart(2, '0')} Week ${String(week.number).padStart(2, '0')}`;
    return { label, startDate: week.startDate, endDate: week.endDate, projected, opening, inflows, outflows };
  };

  const total = (flows) => Object.values(flows).reduce((sum, amount) => sum + amount, 0);
  const inSoles = (flows) =>
    Object.fromEntries(Object.entries(flows).sort(([a], [b]) => (a < b ? -1 : 1)).map(([concept, amount]) => [concept, amount / 100]));
  const lineResource = (line) => {
    const net = total(line.inflows) - total(line.outflows);
    return {
      label: line.label,
      startDate: line.startDate,
      endDate: line.endDate,
      projected: line.projected,
      openingBalance: line.opening / 100,
      inflows: inSoles(line.inflows),
      outflows: inSoles(line.outflows),
      totalInflows: total(line.inflows) / 100,
      totalOutflows: total(line.outflows) / 100,
      netFlow: net / 100,
      closingBalance: (line.opening + net) / 100,
    };
  };

  /** CashFlowCalculator.buildWeekly: the first week opens with the real cash the day before, the next with its closing. */
  const buildWeekly = (weeks) => {
    const today = todayInLima();
    let opening = cashBalanceAt(previousDay(weeks[0].startDate));
    const lines = weeks.map((week) => {
      const line = weekLine(week, opening, today);
      opening += total(line.inflows) - total(line.outflows);
      return lineResource(line);
    });
    return {
      from: weeks[0].startDate,
      to: weeks.at(-1).endDate,
      finalBalance: lines.at(-1).closingBalance,
      hasNegativeBalance: lines.some((line) => line.closingBalance < 0),
      lines,
    };
  };

  // GET /reports/cash-flow/weekly?year=&month= (both required, like the backend @RequestParam int).
  server.get('/api/v1/reports/cash-flow/weekly', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    }
    res.json(buildWeekly(weeksOf(year, month)));
  });

  /** CashFlowCalculator.buildMonthly: one line per month, each the sum of its weeks, chained like the weeks. */
  const buildMonthly = (periods) => {
    const today = todayInLima();
    const first = weeksOf(periods[0].year, periods[0].month)[0];
    let opening = cashBalanceAt(previousDay(first.startDate));
    const lines = periods.map(({ year, month }) => {
      const weeks = weeksOf(year, month);
      let inflows = {};
      let outflows = {};
      let projected = false;
      for (const week of weeks) {
        const line = weekLine(week, 0, today);
        inflows = merge(inflows, line.inflows);
        outflows = merge(outflows, line.outflows);
        projected = projected || line.projected;
      }
      const label = `${year}-${String(month).padStart(2, '0')}`;
      const line = { label, startDate: weeks[0].startDate, endDate: weeks.at(-1).endDate, projected, opening, inflows, outflows };
      opening += total(inflows) - total(outflows);
      return lineResource(line);
    });
    return {
      from: lines[0].startDate,
      to: lines.at(-1).endDate,
      finalBalance: lines.at(-1).closingBalance,
      hasNegativeBalance: lines.some((line) => line.closingBalance < 0),
      lines,
    };
  };

  // GET /reports/cash-flow/monthly: both ends included, at most 24 months, the first not after the last (400).
  server.get('/api/v1/reports/cash-flow/monthly', requireRoles(...READERS), (req, res) => {
    const [fromYear, fromMonth, toYear, toMonth] = ['fromYear', 'fromMonth', 'toYear', 'toMonth'].map((key) => Number(req.query[key]));
    const validMonth = (year, month) => Number.isInteger(year) && year >= 1 && Number.isInteger(month) && month >= 1 && month <= 12;
    if (!validMonth(fromYear, fromMonth) || !validMonth(toYear, toMonth)) {
      return problem(res, 400, 'Bad Request', 'fromYear, fromMonth, toYear y toMonth son obligatorios (mes de 1 a 12).');
    }
    const first = fromYear * 12 + fromMonth - 1;
    const last = toYear * 12 + toMonth - 1;
    if (last - first + 1 > MAX_MONTHS) return problem(res, 400, 'Bad Request', `At most ${MAX_MONTHS} months can be requested`);
    if (first > last) return problem(res, 400, 'Bad Request', 'The first month must not come after the last month');
    const periods = Array.from({ length: last - first + 1 }, (_, i) => ({ year: Math.floor((first + i) / 12), month: ((first + i) % 12) + 1 }));
    res.json(buildMonthly(periods));
  });

  // GET /reports/cash-flow/projection?from=&weeks=: the weeks consecutive weeks starting with the one that contains from.
  server.get('/api/v1/reports/cash-flow/projection', requireRoles(...READERS), (req, res) => {
    const from = req.query.from ?? '';
    const weeks = Number(req.query.weeks);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !Number.isInteger(weeks)) {
      return problem(res, 400, 'Bad Request', 'from (yyyy-MM-dd) y weeks son obligatorios.');
    }
    if (weeks < 1 || weeks > MAX_WEEKS) return problem(res, 400, 'Bad Request', `Weeks must be between 1 and ${MAX_WEEKS}`);
    const list = [weekContaining(from)];
    while (list.length < weeks) list.push(weekContaining(shiftDay(list.at(-1).endDate, 1)));
    res.json(buildWeekly(list));
  });

  // ---------- Financial statements ----------
  /** LedgerQueryService.balances: net of each account, signed by its normal side (assets and expenses debit). */
  const accountBalances = (accepts) => {
    const types = new Map(db.get('ledger-accounts').value().map((account) => [account.code, account.type]));
    const net = new Map();
    for (const entry of db.get('journal-entries').value()) {
      if (!accepts(entry.entryDate)) continue;
      for (const line of entry.lines) {
        net.set(line.accountCode, (net.get(line.accountCode) ?? 0) + cents(line.debit) - cents(line.credit));
      }
    }
    return new Map([...net].map(([code, amount]) => [code, ['ASSET', 'EXPENSE'].includes(types.get(code)) ? amount : -amount]));
  };
  const sumOf = (balances, accepts) => [...balances].reduce((sum, [code, amount]) => (accepts(code) ? sum + amount : sum), 0);
  const groupOf = (balances, accepts) => {
    const group = {};
    for (const [code, amount] of [...balances].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (accepts(code) && amount !== 0) group[code] = amount;
    }
    return group;
  };
  const inSolesMap = (group) => Object.fromEntries(Object.entries(group).map(([code, amount]) => [code, amount / 100]));
  const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const firstDay = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`;
  const validPeriod = (year, month) => Number.isInteger(year) && year >= 1 && Number.isInteger(month) && month >= 1 && month <= 12;

  // GET /reports/income-statement: FinancialStatementsQueryService groups by code: 7 revenue, 60 direct, 67 financial,
  // the rest of 6 operating, 8 income tax. The first month must not come after the last (400).
  server.get('/api/v1/reports/income-statement', requireRoles(...READERS), (req, res) => {
    const [fromYear, fromMonth, toYear, toMonth] = ['fromYear', 'fromMonth', 'toYear', 'toMonth'].map((key) => Number(req.query[key]));
    if (!validPeriod(fromYear, fromMonth) || !validPeriod(toYear, toMonth)) {
      return problem(res, 400, 'Bad Request', 'fromYear, fromMonth, toYear y toMonth son obligatorios (mes de 1 a 12).');
    }
    if (fromYear * 12 + fromMonth > toYear * 12 + toMonth) {
      return problem(res, 400, 'Bad Request', 'The first month must not come after the last month');
    }
    const [start, end] = [firstDay(fromYear, fromMonth), lastDay(toYear, toMonth)];
    const movements = accountBalances((date) => date >= start && date <= end);
    const revenue = sumOf(movements, (code) => code.startsWith('7'));
    const directCosts = sumOf(movements, (code) => code.startsWith('60'));
    const operatingExpenses = sumOf(movements, (code) => code.startsWith('6') && !code.startsWith('60') && !code.startsWith('67'));
    const financialExpenses = sumOf(movements, (code) => code.startsWith('67'));
    const incomeTax = sumOf(movements, (code) => code.startsWith('8'));
    const grossProfit = revenue - directCosts;
    const operatingProfit = grossProfit - operatingExpenses;
    const profitBeforeTax = operatingProfit - financialExpenses;
    res.json({
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      revenue: revenue / 100,
      directCosts: directCosts / 100,
      grossProfit: grossProfit / 100,
      operatingExpenses: operatingExpenses / 100,
      operatingProfit: operatingProfit / 100,
      financialExpenses: financialExpenses / 100,
      profitBeforeTax: profitBeforeTax / 100,
      incomeTax: incomeTax / 100,
      netProfit: (profitBeforeTax - incomeTax) / 100,
    });
  });

  // GET /reports/balance-sheet: balances up to the end of the month; 1 to 3 assets, 4 liabilities, 5 equity, and RESULT
  // (revenue minus expenses and income tax), since there is no period closing.
  server.get('/api/v1/reports/balance-sheet', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!validPeriod(year, month)) return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    const asOf = lastDay(year, month);
    const balances = accountBalances((date) => date <= asOf);
    const assets = groupOf(balances, (code) => '123'.includes(code[0]));
    const liabilities = groupOf(balances, (code) => code.startsWith('4'));
    const equity = groupOf(balances, (code) => code.startsWith('5'));
    equity.RESULT = sumOf(balances, (code) => code.startsWith('7')) - sumOf(balances, (code) => code.startsWith('6') || code.startsWith('8'));
    const totalOf = (group) => Object.values(group).reduce((sum, amount) => sum + amount, 0);
    const difference = totalOf(assets) - totalOf(liabilities) - totalOf(equity);
    res.json({
      asOf,
      assets: inSolesMap(assets),
      liabilities: inSolesMap(liabilities),
      equity: inSolesMap(equity),
      totalAssets: totalOf(assets) / 100,
      totalLiabilities: totalOf(liabilities) / 100,
      totalEquity: totalOf(equity) / 100,
      difference: difference / 100,
      balanced: difference === 0,
    });
  });

  // ---------- Project profitability ----------
  /** ProjectProfitabilityQueryService.build and ProjectProfitability, in cents. */
  const profitabilityOf = (project, igv, year, month) => {
    const budget = cents(project.budget);
    const expenses = db.get('expenses').value().filter((e) => e.projectId === project.id && !e.annulled);
    const actual = expenses.reduce((sum, e) => sum + cents(e.taxableBase), 0);
    const byCategory = {};
    for (const expense of expenses) byCategory[expense.category] = (byCategory[expense.category] ?? 0) + cents(expense.taxableBase);
    const estimated = db.get('cost-estimates').value()
      .filter((estimate) => estimate.projectId === project.id)
      .reduce((sum, estimate) => sum + cents(estimate.estimatedAmount), 0);
    const commission = Math.round(budget * (1 + igv) * project.salesCommissionRate);
    const gross = Math.round((budget - actual - commission) * project.participation);
    const progress = db.get('progress-records').value().find((r) => r.projectId === project.id && r.year === year && r.month === month)?.percentage ?? 0;
    const invoices = db.get('invoices').value().filter((i) => i.projectId === project.id && i.status !== 'VOIDED');
    const invoiceIds = new Set(invoices.map((i) => i.id));
    const collected = db.get('invoice-payments').value()
      .filter((p) => invoiceIds.has(p.invoiceId) && p.type !== 'RETENTION_CERTIFICATE')
      .reduce((sum, p) => sum + cents(p.amount), 0);
    return {
      projectId: project.id,
      code: project.code,
      name: project.name,
      clientName: db.get('clients').find({ id: project.clientId }).value()?.businessName ?? null,
      status: project.status,
      currency: project.currency,
      budget: budget / 100,
      estimatedCost: estimated / 100,
      actualCost: actual / 100,
      actualCostByCategory: inSolesMap(byCategory),
      costDeviation: (actual - estimated) / 100,
      salesCommission: commission / 100,
      grossProfit: gross / 100,
      margin: budget === 0 ? 0 : Math.round((gross / budget) * 10000) / 10000,
      accumulatedProgress: project.accumulatedProgress,
      recognizedProfitInPeriod: Math.round(gross * progress) / 100,
      invoiced: invoices.reduce((sum, i) => sum + cents(i.total), 0) / 100,
      collected: collected / 100,
    };
  };

  // GET /reports/projects/profitability?year=&month=: every project, whatever its status.
  server.get('/api/v1/reports/projects/profitability', requireRoles(...READERS), (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!validPeriod(year, month)) return problem(res, 400, 'Bad Request', 'year y month son obligatorios (month de 1 a 12).');
    const igv = taxParametersAt(db, todayInLima())?.igv ?? 0.18;
    res.json(db.get('projects').value().map((project) => profitabilityOf(project, igv, year, month)));
  });
  server.use('/api/v1/reports', requireRoles(...READERS));
};
