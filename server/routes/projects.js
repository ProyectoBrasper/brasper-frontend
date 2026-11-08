// Projects fake routes: /clients and /projects (write: ADMIN, ACCOUNTING, ENGINEER).
// Reads (GET /clients, GET /projects?status=&clientId=) use the generic json-server routes.
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

  // ---------- Projects (same rules and messages as the backend Project aggregate) ----------
  const projects = () => db.get('projects');
  const findProject = (req) => projects().find({ id: Number(req.params.id) }).value();
  const isOpen = (project) => project.status === 'QUOTED' || project.status === 'IN_PROGRESS';
  const NOT_FOUND = 'Proyecto no encontrado.';
  const INVALID_TRANSITION = 'El estado del proyecto no permite esta operación.';

  /** Validates the editable project fields; returns an error message or null. */
  const invalidProject = (body) => {
    if (!text(body.name, 200)) return 'El nombre del proyecto es obligatorio.';
    if (!(Number(body.budget) > 0)) return 'El presupuesto debe ser mayor a 0.';
    const participation = Number(body.participation);
    if (!(participation > 0 && participation <= 1)) return 'La participación debe ser mayor a 0 y como máximo 1.';
    const commission = Number(body.salesCommissionRate);
    if (!(commission >= 0 && commission <= 1)) return 'La comisión de ventas debe estar entre 0 y 1.';
    return null;
  };

  const editableFields = (body) => ({
    name: text(body.name, 200),
    description: text(body.description, 1000),
    budget: Number(body.budget),
    participation: Number(body.participation),
    salesCommissionRate: Number(body.salesCommissionRate),
  });

  server.post('/api/v1/projects', canWrite, (req, res) => {
    const body = req.body ?? {};
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!/^\d{3}BR-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)-\d{4}$/.test(code)) {
      return problem(res, 400, 'Bad Request', 'El código debe tener el formato 862BR-AGO-2026.');
    }
    const error = invalidProject(body);
    if (error) return problem(res, 400, 'Bad Request', error);
    if (!['PEN', 'USD'].includes(body.currency)) return problem(res, 400, 'Bad Request', 'Moneda no válida.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.quotedOn ?? '')) {
      return problem(res, 400, 'Bad Request', 'La fecha de cotización no es válida.');
    }
    if (!clients().find({ id: Number(body.clientId) }).value()) {
      return problem(res, 404, 'Not Found', 'Cliente no encontrado.');
    }
    if (projects().find({ code }).value()) return problem(res, 409, 'Conflict', 'Ya existe un proyecto con ese código.');
    const project = {
      id: nextId('projects'),
      code,
      ...editableFields(body),
      clientId: Number(body.clientId),
      currency: body.currency,
      quotedOn: body.quotedOn,
      status: 'QUOTED',
      accumulatedProgress: 0,
      estimatedDirectCost: 0,
    };
    projects().push(project).write();
    res.status(201).json(project);
  });

  // Like UpdateProjectResource: code, client, currency and quote date do not change.
  server.put('/api/v1/projects/:id', canWrite, (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    if (!isOpen(project)) return problem(res, 409, 'Conflict', INVALID_TRANSITION);
    const error = invalidProject(req.body ?? {});
    if (error) return problem(res, 400, 'Bad Request', error);
    projects().find({ id: project.id }).assign(editableFields(req.body)).write();
    res.json(findProject(req));
  });

  server.post('/api/v1/projects/:id/start', canWrite, (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    if (project.status !== 'QUOTED') return problem(res, 409, 'Conflict', INVALID_TRANSITION);
    projects().find({ id: project.id }).assign({ status: 'IN_PROGRESS' }).write();
    res.json(findProject(req));
  });

  server.post('/api/v1/projects/:id/cancel', canWrite, (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    if (!isOpen(project)) return problem(res, 409, 'Conflict', INVALID_TRANSITION);
    projects().find({ id: project.id }).assign({ status: 'CANCELLED' }).write();
    res.json(findProject(req));
  });

  // ---------- Progress and cost estimates (nested under the project, like the backend) ----------
  const progressOf = (projectId) =>
    db
      .get('progress-records')
      .filter({ projectId })
      .sortBy((r) => r.year * 100 + r.month)
      .value();
  const estimatesOf = (projectId) => db.get('cost-estimates').filter({ projectId }).value();
  const round4 = (value) => Math.round(value * 10000) / 10000;
  const round2 = (value) => Math.round(value * 100) / 100;
  // The resources do not carry projectId (it is in the URL).
  const progressResource = ({ projectId, ...record }) => record;
  const estimateResource = ({ projectId, ...estimate }) => estimate;
  const CATEGORIES = ['MATERIALS', 'LABOR', 'TRAVEL_EXPENSES', 'OTHER'];

  server.get('/api/v1/projects/:id/progress', requireRoles(), (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    res.json(progressOf(project.id).map(progressResource));
  });

  server.post('/api/v1/projects/:id/progress', canWrite, (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    const year = Number(req.body?.year);
    const month = Number(req.body?.month);
    const percentage = round4(Number(req.body?.percentage));
    if (!(year >= 2000 && year <= 2100) || !(month >= 1 && month <= 12) || !(percentage > 0 && percentage <= 1)) {
      return problem(res, 400, 'Bad Request', 'Datos de avance no válidos.');
    }
    if (project.status !== 'IN_PROGRESS') return problem(res, 409, 'Conflict', INVALID_TRANSITION);
    const records = progressOf(project.id);
    if (records.some((r) => r.year === year && r.month === month)) {
      return problem(res, 409, 'Conflict', 'Ya hay avance registrado para ese mes.');
    }
    const total = round4(records.reduce((sum, r) => sum + r.percentage, 0) + percentage);
    if (total > 1) return problem(res, 422, 'Unprocessable Entity', 'El avance total no puede superar el 100%.');
    const record = { id: nextId('progress-records'), projectId: project.id, year, month, percentage };
    db.get('progress-records').push(record).write();
    projects()
      .find({ id: project.id })
      .assign({ accumulatedProgress: total, status: total === 1 ? 'COMPLETED' : project.status })
      .write();
    res.status(201).json(progressResource(record));
  });

  server.get('/api/v1/projects/:id/cost-estimates', requireRoles(), (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    res.json(estimatesOf(project.id).map(estimateResource));
  });

  // Creates or replaces the estimate of a category and recalculates the estimated direct cost.
  server.put('/api/v1/projects/:id/cost-estimates', canWrite, (req, res) => {
    const project = findProject(req);
    if (!project) return problem(res, 404, 'Not Found', NOT_FOUND);
    const { category, currency } = req.body ?? {};
    const estimatedAmount = round2(Number(req.body?.estimatedAmount));
    if (!CATEGORIES.includes(category) || !(estimatedAmount >= 0)) {
      return problem(res, 400, 'Bad Request', 'Datos de estimación no válidos.');
    }
    if (currency !== project.currency) {
      return problem(res, 422, 'Unprocessable Entity', 'La moneda del estimado debe ser la del proyecto.');
    }
    if (!isOpen(project)) return problem(res, 409, 'Conflict', INVALID_TRANSITION);
    const existing = db.get('cost-estimates').find({ projectId: project.id, category }).value();
    if (existing) {
      db.get('cost-estimates').find({ id: existing.id }).assign({ estimatedAmount }).write();
    } else {
      db.get('cost-estimates')
        .push({ id: nextId('cost-estimates'), projectId: project.id, category, estimatedAmount })
        .write();
    }
    const total = round2(estimatesOf(project.id).reduce((sum, e) => sum + e.estimatedAmount, 0));
    projects().find({ id: project.id }).assign({ estimatedDirectCost: total }).write();
    res.json(estimateResource(db.get('cost-estimates').find({ projectId: project.id, category }).value()));
  });

  server.get('/api/v1/projects/:id', requireRoles(), (req, res, next) => {
    if (!findProject(req)) return problem(res, 404, 'Not Found', NOT_FOUND);
    next();
  });
};
