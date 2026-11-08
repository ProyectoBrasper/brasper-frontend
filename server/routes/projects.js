// Projects fake routes: /clients (write: ADMIN, ACCOUNTING, ENGINEER). Reads use the generic routes.
const WRITERS = ['ROLE_ADMIN', 'ROLE_ACCOUNTING', 'ROLE_ENGINEER'];

const text = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
const isEmail = (value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

module.exports = (server, { db, problem, requireRoles, nextId }) => {
  const canWrite = requireRoles(...WRITERS);
  const clients = () => db.get('clients');

  /** Validates the editable client fields; returns an error message or null. */
  const invalidClient = (body) => {
    if (!text(body.businessName, 200)) return 'La razón social es obligatoria.';
    if (!isEmail(text(body.email, 150))) return 'El correo no es válido.';
    return null;
  };

  server.post('/api/v1/clients', canWrite, (req, res) => {
    const body = req.body ?? {};
    const error = invalidClient(body);
    if (error) return problem(res, 400, 'Bad Request', error);
    const ruc = String(body.ruc ?? '').trim();
    if (!/^\d{11}$/.test(ruc)) return problem(res, 400, 'Bad Request', 'El RUC debe tener 11 dígitos.');
    if (clients().find({ ruc }).value()) return problem(res, 409, 'Conflict', 'Ya existe un cliente con ese RUC.');
    const client = {
      id: nextId('clients'),
      businessName: text(body.businessName, 200),
      ruc,
      contactName: text(body.contactName, 150),
      phone: text(body.phone, 30),
      email: text(body.email, 150),
    };
    clients().push(client).write();
    res.status(201).json(client);
  });

  // Like the backend's UpdateClientResource: the RUC is not editable.
  server.put('/api/v1/clients/:id', canWrite, (req, res) => {
    const id = Number(req.params.id);
    if (!clients().find({ id }).value()) return problem(res, 404, 'Not Found', 'Cliente no encontrado.');
    const body = req.body ?? {};
    const error = invalidClient(body);
    if (error) return problem(res, 400, 'Bad Request', error);
    clients()
      .find({ id })
      .assign({
        businessName: text(body.businessName, 200),
        contactName: text(body.contactName, 150),
        phone: text(body.phone, 30),
        email: text(body.email, 150),
      })
      .write();
    res.json(clients().find({ id }).value());
  });

  server.get('/api/v1/clients/:id', requireRoles(), (req, res, next) => {
    if (!clients().find({ id: Number(req.params.id) }).value()) {
      return problem(res, 404, 'Not Found', 'Cliente no encontrado.');
    }
    next();
  });
};
