import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const clientList = () => import('./views/client-list/client-list').then((m) => m.ClientList);
const clientForm = () => import('./views/client-form/client-form').then((m) => m.ClientForm);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.operationsWrite } };

/**
 * Projects context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/projects`.
 */
export const projectsRoutes: Routes = [
  // Until ProjectList exists (next PR), /projects shows the clients.
  { path: '', redirectTo: 'clients', pathMatch: 'full' },
  { path: 'clients', loadComponent: clientList, title: 'Brasper' },
  { path: 'clients/new', loadComponent: clientForm, title: 'Brasper', ...canWrite },
  { path: 'clients/:id/edit', loadComponent: clientForm, title: 'Brasper', ...canWrite },
];
