// Treasury fake routes. Reads are for finance roles only (backend #120); writes are ADMIN and ACCOUNTING. Same
// rules, order of checks and Spanish messages as the backend (messages_es.properties). Movements, transfers,
// payables, loans and partner writes come with their screens.
const READERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_MANAGEMENT'];
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING'];
const BANKS = ['BCP', 'BBVA', 'BANCO_DE_LA_NACION', 'CASH'];
const ACCOUNT_TYPES = ['CHECKING', 'DETRACTIONS', 'PETTY_CASH'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Stored record → BankAccountResource (the backend does not return `openedOn`). */
const accountResource = ({ openedOn, ...account }) => account;

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const accounts = () => db.get('bank-accounts');

  server.get('/api/v1/bank-accounts', requireRoles(...READERS), (req, res) => {
    res.json(accounts().sortBy('id').value().map(accountResource));
  });

  server.get('/api/v1/bank-accounts/:id', requireRoles(...READERS), (req, res) => {
    const account = accounts().find({ id: Number(req.params.id) }).value();
    if (!account) return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    res.json(accountResource(account));
  });

  // Opening: the current balance starts at the opening balance (the backend sums the movements on top of it).
  server.post('/api/v1/bank-accounts', requireRoles(...WRITERS), (req, res) => {
    const body = req.body ?? {};
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
    const balance = body.openingBalance;
    if (!BANKS.includes(body.bank)) return problem(res, 400, 'Bad Request', 'Banco no válido.');
    if (!accountNumber || accountNumber.length > 50) {
      return problem(res, 400, 'Bad Request', 'El número de cuenta debe tener de 1 a 50 caracteres.');
    }
    if (!ACCOUNT_TYPES.includes(body.type)) return problem(res, 400, 'Bad Request', 'Tipo de cuenta no válido.');
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (typeof balance !== 'number' || balance < 0 || balance >= 1e12 || Math.abs(balance * 100 - Math.round(balance * 100)) > 1e-6) {
      return problem(res, 400, 'Bad Request', 'El saldo inicial no puede ser negativo y admite hasta 2 decimales.');
    }
    if (!ISO_DATE.test(body.openedOn ?? '')) return problem(res, 400, 'Bad Request', 'La fecha de apertura no es válida.');
    // Same order as BankAccountCommandService: currency first, then the duplicate number.
    if (body.currency !== 'PEN') {
      return problem(res, 422, 'Unprocessable Entity', 'Por ahora los importes solo pueden ser en PEN.');
    }
    if (accounts().find({ accountNumber }).value()) {
      return problem(res, 409, 'Conflict', 'Ya existe una cuenta bancaria con ese número.');
    }
    const account = {
      id: nextId('bank-accounts'),
      bank: body.bank,
      accountNumber,
      type: body.type,
      currency: body.currency,
      openingBalance: balance,
      currentBalance: balance,
      openedOn: body.openedOn,
    };
    accounts().push(account).write();
    res.status(201).json(accountResource(account));
  });
  // Anything else on /bank-accounts falls through to json-server: keep it behind the finance roles.
  server.use('/api/v1/bank-accounts', requireRoles(...READERS));

  // Partners: same read roles. Registering partners and their contributions come with the partners screen.
  server.get('/api/v1/partners/:id', requireRoles(...READERS), (req, res, next) => {
    if (!db.get('partners').find({ id: Number(req.params.id) }).value()) {
      return problem(res, 404, 'Not Found', 'Socio no encontrado.');
    }
    next();
  });
  server.use('/api/v1/partners', requireRoles(...READERS));
};
