// Treasury fake routes. Reads are for finance roles only (backend #120); GET /bank-accounts, /partners and their
// /:id use the generic json-server routes behind this guard. The rest comes with its screens.
const READERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_MANAGEMENT'];

module.exports = (server, { db, problem, requireRoles }) => {
  server.get('/api/v1/bank-accounts/:id', requireRoles(...READERS), (req, res, next) => {
    if (!db.get('bank-accounts').find({ id: Number(req.params.id) }).value()) {
      return problem(res, 404, 'Not Found', 'Cuenta bancaria no encontrada.');
    }
    next();
  });
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
