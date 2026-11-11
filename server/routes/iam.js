// IAM fake routes: /auth/sign-in, /auth/sign-up (ADMIN), /users (ADMIN).
const ROLES = ['ROLE_ADMIN', 'ROLE_MANAGEMENT', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];
const LAST_ADMIN = 'No se puede desactivar ni cambiar de rol al último administrador activo.';

const withoutPassword = ({ password, ...user }) => user;

const WEAK_PASSWORD = 'La contraseña debe tener de 8 a 72 caracteres, con al menos una letra y un número.';
const isStrong = (password) => /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(password ?? '');
const isBlank = (value) => typeof value !== 'string' || value.trim() === '';

module.exports = (server, { db, problem, requireRoles, nextId, tokenUser }) => {
  const requireAdmin = requireRoles('ROLE_ADMIN');
  const users = () => db.get('users');
  const isLastActiveAdmin = (user) =>
    user.role === 'ROLE_ADMIN' && users().filter({ role: 'ROLE_ADMIN', active: true }).size().value() === 1;

  // Like the backend SignInThrottle (#121): 5 wrong passwords lock the username for 15 minutes (429).
  const MAX_FAILURES = 5;
  const LOCK_MS = 15 * 60 * 1000;
  const attempts = new Map(); // username -> { failures, lockedUntil }

  server.post('/api/v1/auth/sign-in', (req, res) => {
    const { username, password } = req.body ?? {};
    const state = attempts.get(username) ?? { failures: 0, lockedUntil: 0 };
    if (state.lockedUntil > Date.now()) {
      return problem(res, 429, 'Too Many Requests', 'Demasiados intentos fallidos de inicio de sesión. Inténtalo de nuevo en 15 minutos.');
    }
    const user = users().find({ username }).value();
    if (!user || user.password !== password) {
      const failures = state.failures + 1;
      attempts.set(username, { failures, lockedUntil: failures >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
      return problem(res, 401, 'Unauthorized', 'Usuario o contraseña incorrectos.');
    }
    attempts.delete(username);
    if (!user.active) {
      return problem(res, 403, 'Forbidden', 'Este usuario está inactivo.');
    }
    const { id, fullName, role } = user;
    res.json({ id, username, fullName, role, token: `fake-jwt.${id}` });
  });

  // Own password, like UserCommandService: @NotBlank (400), locked (429), the user (404), the current password (422,
  // counted apart from the sign-in failures), a weak new one (422). 204. The session stays.
  const passwordAttempts = new Map();
  server.put('/api/v1/auth/password', requireRoles(), (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (isBlank(currentPassword) || isBlank(newPassword)) return problem(res, 400, 'Bad Request', 'La contraseña actual y la nueva son obligatorias.');
    const user = tokenUser(req);
    const state = passwordAttempts.get(user.username) ?? { failures: 0, lockedUntil: 0 };
    if (state.lockedUntil > Date.now()) {
      return problem(res, 429, 'Too Many Requests', 'Demasiados intentos fallidos de inicio de sesión. Inténtalo de nuevo en 15 minutos.');
    }
    if (user.password !== currentPassword) {
      const failures = state.failures + 1;
      passwordAttempts.set(user.username, { failures, lockedUntil: failures >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
      return problem(res, 422, 'Unprocessable Entity', 'La contraseña actual no es correcta.');
    }
    if (!isStrong(newPassword)) return problem(res, 422, 'Unprocessable Entity', WEAK_PASSWORD);
    passwordAttempts.delete(user.username);
    users().find({ id: user.id }).assign({ password: newPassword }).write();
    res.status(204).end();
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

  // Reset, like UserCommandService: @NotBlank (400), the user (404), a weak password (422). It clears the lock. 204.
  server.put('/api/v1/users/:id/password', requireAdmin, (req, res) => {
    const newPassword = req.body?.newPassword;
    if (isBlank(newPassword)) return problem(res, 400, 'Bad Request', 'La contraseña nueva es obligatoria.');
    const user = users().find({ id: Number(req.params.id) }).value();
    if (!user) return problem(res, 404, 'Not Found', 'Usuario no encontrado.');
    if (!isStrong(newPassword)) return problem(res, 422, 'Unprocessable Entity', WEAK_PASSWORD);
    attempts.delete(user.username);
    passwordAttempts.delete(user.username);
    users().find({ id: user.id }).assign({ password: newPassword }).write();
    res.status(204).end();
  });

  server.post('/api/v1/users/:id/reactivate', requireAdmin, (req, res) => {
    const user = users().find({ id: Number(req.params.id) }).value();
    if (!user) return problem(res, 404, 'Not Found', 'Usuario no encontrado.');
    users().find({ id: user.id }).assign({ active: true }).write();
    res.json(withoutPassword(users().find({ id: user.id }).value()));
  });

  // GET /users and /users/:id (generic json-server routes) are admin only too.
  server.use('/api/v1/users', requireAdmin);
};
