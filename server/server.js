// Fake API for development (json-server 0.17). Mirrors the Spring Boot backend contract:
// same paths under /api/v1, same JSON and RFC 9457 ProblemDetail errors. Test data only.
// Run with `npm run start:api` (http://localhost:3000/api/v1).
// db.json is the seed: every start copies it to db.runtime.json (git-ignored), so changes made
// while testing are discarded on restart and the seed stays clean.
const fs = require('node:fs');
const path = require('node:path');
const jsonServer = require('json-server');

const PORT = 3000;
const ROLES = ['ROLE_ADMIN', 'ROLE_MANAGEMENT', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];

const runtimeDb = path.join(__dirname, 'db.runtime.json');
fs.copyFileSync(path.join(__dirname, 'db.json'), runtimeDb);

const server = jsonServer.create();
const router = jsonServer.router(runtimeDb);
const db = router.db;

const problem = (res, status, title, detail) =>
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status, detail });

const withoutPassword = ({ password, ...user }) => user;

const tokenUser = (req) => {
  const match = /^Bearer fake-jwt\.(\d+)$/.exec(req.get('Authorization') ?? '');
  return match ? db.get('users').find({ id: Number(match[1]), active: true }).value() : undefined;
};

const requireAdmin = (req, res, next) => {
  const user = tokenUser(req);
  if (!user) return problem(res, 401, 'Unauthorized', 'Sesión no válida.');
  if (user.role !== 'ROLE_ADMIN') return problem(res, 403, 'Forbidden', 'No tienes permiso.');
  next();
};

const isLastActiveAdmin = (user) =>
  user.role === 'ROLE_ADMIN' && db.get('users').filter({ role: 'ROLE_ADMIN', active: true }).size().value() === 1;

server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);

server.post('/api/v1/auth/sign-in', (req, res) => {
  const { username, password } = req.body ?? {};
  const user = db.get('users').find({ username }).value();
  if (!user || user.password !== password) {
    return problem(res, 401, 'Unauthorized', 'Usuario o contraseña incorrectos.');
  }
  if (!user.active) {
    return problem(res, 403, 'Forbidden', 'Este usuario está inactivo.');
  }
  const { id, fullName, role } = user;
  res.json({ id, username, fullName, role, token: `fake-jwt.${id}` });
});

server.post('/api/v1/auth/sign-up', requireAdmin, (req, res) => {
  const { username, password, fullName, role } = req.body ?? {};
  if (!/^[a-z0-9._-]{3,50}$/.test(username ?? '') || !fullName || !ROLES.includes(role)) {
    return problem(res, 400, 'Bad Request', 'Datos de usuario no válidos.');
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(password ?? '')) {
    return problem(res, 422, 'Unprocessable Entity', 'La contraseña debe tener de 8 a 72 caracteres, con al menos una letra y un número.');
  }
  if (db.get('users').find({ username }).value()) {
    return problem(res, 409, 'Conflict', 'Ese nombre de usuario ya está en uso.');
  }
  const id = Math.max(0, ...db.get('users').map('id').value()) + 1;
  const user = { id, username, fullName, role, active: true, password };
  db.get('users').push(user).write();
  res.status(201).json(withoutPassword(user));
});

server.put('/api/v1/users/:id/role', requireAdmin, (req, res) => {
  const user = db.get('users').find({ id: Number(req.params.id) }).value();
  if (!user) return problem(res, 404, 'Not Found', 'Usuario no encontrado.');
  if (!ROLES.includes(req.body?.role)) return problem(res, 400, 'Bad Request', 'Rol no válido.');
  if (req.body.role !== 'ROLE_ADMIN' && isLastActiveAdmin(user)) {
    return problem(res, 409, 'Conflict', 'No se puede desactivar ni cambiar de rol al último administrador activo.');
  }
  db.get('users').find({ id: user.id }).assign({ role: req.body.role }).write();
  res.json(withoutPassword(db.get('users').find({ id: user.id }).value()));
});

server.post('/api/v1/users/:id/deactivate', requireAdmin, (req, res) => {
  const user = db.get('users').find({ id: Number(req.params.id) }).value();
  if (!user) return problem(res, 404, 'Not Found', 'Usuario no encontrado.');
  if (isLastActiveAdmin(user)) {
    return problem(res, 409, 'Conflict', 'No se puede desactivar ni cambiar de rol al último administrador activo.');
  }
  db.get('users').find({ id: user.id }).assign({ active: false }).write();
  res.json(withoutPassword(db.get('users').find({ id: user.id }).value()));
});

server.use('/api/v1/users', requireAdmin);

// Never expose passwords through the generic json-server routes.
router.render = (req, res) => {
  const data = res.locals.data;
  const strip = (item) => (item && typeof item === 'object' && 'password' in item ? withoutPassword(item) : item);
  res.jsonp(Array.isArray(data) ? data.map(strip) : strip(data));
};

server.use(jsonServer.rewriter(require('./routes.json')));
server.use(router);
server.listen(PORT, () => console.log(`Brasper fake API on http://localhost:${PORT}/api/v1`));
