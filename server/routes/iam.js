// IAM fake routes: /auth/sign-in, /auth/sign-up (ADMIN), /users (ADMIN).
const ROLES = ['ROLE_ADMIN', 'ROLE_MANAGEMENT', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];
const LAST_ADMIN = 'No se puede desactivar ni cambiar de rol al último administrador activo.';

const withoutPassword = ({ password, ...user }) => user;

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const requireAdmin = requireRoles('ROLE_ADMIN');
  const users = () => db.get('users');
  const isLastActiveAdmin = (user) =>
    user.role === 'ROLE_ADMIN' && users().filter({ role: 'ROLE_ADMIN', active: true }).size().value() === 1;

  server.post('/api/v1/auth/sign-in', (req, res) => {
    const { username, password } = req.body ?? {};
    const user = users().find({ username }).value();
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
    if (users().find({ username }).value()) {
      return problem(res, 409, 'Conflict', 'Ese nombre de usuario ya está en uso.');
    }
    const user = { id: nextId('users'), username, fullName, role, active: true, password };
    users().push(user).write();
    res.status(201).json(withoutPassword(user));
  });

  server.put('/api/v1/users/:id/role', requireAdmin, (req, res) => {
    const user = users().find({ id: Number(req.params.id) }).value();
    if (!user) return problem(res, 404, 'Not Found', 'Usuario no encontrado.');
    if (!ROLES.includes(req.body?.role)) return problem(res, 400, 'Bad Request', 'Rol no válido.');
    if (req.body.role !== 'ROLE_ADMIN' && isLastActiveAdmin(user)) return problem(res, 409, 'Conflict', LAST_ADMIN);
    users().find({ id: user.id }).assign({ role: req.body.role }).write();
    res.json(withoutPassword(users().find({ id: user.id }).value()));
  });

  server.post('/api/v1/users/:id/deactivate', requireAdmin, (req, res) => {
    const user = users().find({ id: Number(req.params.id) }).value();
    if (!user) return problem(res, 404, 'Not Found', 'Usuario no encontrado.');
    if (isLastActiveAdmin(user)) return problem(res, 409, 'Conflict', LAST_ADMIN);
    users().find({ id: user.id }).assign({ active: false }).write();
    res.json(withoutPassword(users().find({ id: user.id }).value()));
  });

  // GET /users and /users/:id (generic json-server routes) are admin only too.
  server.use('/api/v1/users', requireAdmin);
};
