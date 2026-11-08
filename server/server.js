// Fake API for development (json-server 0.17). Mirrors the Spring Boot backend contract:
// same paths under /api/v1, same JSON and RFC 9457 ProblemDetail errors. Test data only.
// Run with `npm run start:api` (http://localhost:3000/api/v1).
// db.json is the seed: every start copies it to db.runtime.json (git-ignored), so changes made
// while testing are discarded on restart and the seed stays clean.
// Custom routes per bounded context live in ./routes/<context>.js; anything they do not handle
// falls through to the generic json-server collections.
const fs = require('node:fs');
const path = require('node:path');
const jsonServer = require('json-server');

const PORT = Number(process.env.PORT ?? 3000);

const runtimeDb = path.join(__dirname, 'db.runtime.json');
fs.copyFileSync(path.join(__dirname, 'db.json'), runtimeDb);

const server = jsonServer.create();
const router = jsonServer.router(runtimeDb);
const db = router.db;

/** RFC 9457 error body, like Spring's ProblemDetail. */
const problem = (res, status, title, detail) =>
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status, detail });

/** Signed-in user from the fake bearer token (`fake-jwt.<userId>`), if active. */
const tokenUser = (req) => {
  const match = /^Bearer fake-jwt\.(\d+)$/.exec(req.get('Authorization') ?? '');
  return match ? db.get('users').find({ id: Number(match[1]), active: true }).value() : undefined;
};

/** Middleware: requires a session and, if roles are given, one of them (401 / 403 like Spring). */
const requireRoles =
  (...roles) =>
  (req, res, next) => {
    const user = tokenUser(req);
    if (!user) return problem(res, 401, 'Unauthorized', 'Sesión no válida.');
    if (roles.length && !roles.includes(user.role)) return problem(res, 403, 'Forbidden', 'No tienes permiso.');
    next();
  };

/** Next id for a collection. */
const nextId = (collection) => Math.max(0, ...db.get(collection).map('id').value()) + 1;

const context = { db, problem, requireRoles, nextId };

server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);

require('./routes/iam')(server, context);
require('./routes/projects')(server, context);
require('./routes/billing')(server, context);

// Every other /api/v1 route needs a session.
server.use('/api/v1', requireRoles());

// Never expose passwords through the generic json-server routes.
router.render = (req, res) => {
  const data = res.locals.data;
  const strip = (item) => {
    if (item && typeof item === 'object' && 'password' in item) {
      const { password, ...rest } = item;
      return rest;
    }
    return item;
  };
  res.jsonp(Array.isArray(data) ? data.map(strip) : strip(data));
};

server.use(jsonServer.rewriter(require('./routes.json')));
server.use(router);
server.listen(PORT, () => console.log(`Brasper fake API on http://localhost:${PORT}/api/v1`));
