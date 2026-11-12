import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const projectList = () => import('./views/project-list/project-list').then((m) => m.ProjectList);
const projectForm = () => import('./views/project-form/project-form').then((m) => m.ProjectForm);
const projectDetail = () => import('./views/project-detail/project-detail').then((m) => m.ProjectDetail);
const clientList = () => import('./views/client-list/client-list').then((m) => m.ClientList);
const clientForm = () => import('./views/client-form/client-form').then((m) => m.ClientForm);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.operationsWrite } };

/**
 * Projects context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/projects`.
 * Order matters: `new` and `:id/edit` before `:id`.
 */
export const projectsRoutes: Routes = [
  { path: 'clients', loadComponent: clientList, title: 'Brasper' },
  { path: 'clients/new', loadComponent: clientForm, title: 'Brasper', ...canWrite },
  { path: 'clients/:id/edit', loadComponent: clientForm, title: 'Brasper', ...canWrite },
  { path: '', loadComponent: projectList, title: 'Brasper' },
  { path: 'new', loadComponent: projectForm, title: 'Brasper', ...canWrite },
  { path: ':id/edit', loadComponent: projectForm, title: 'Brasper', ...canWrite },
  { path: ':id', loadComponent: projectDetail, title: 'Brasper' },
];
