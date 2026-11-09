import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const employeeList = () => import('./views/employee-list/employee-list').then((m) => m.EmployeeList);
const employeeForm = () => import('./views/employee-form/employee-form').then((m) => m.EmployeeForm);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.staffWrite } };

/**
 * Staff context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/staff` (salaries: admin,
 * accounting and management read; admin and accounting write). `new` goes before `:id/edit`.
 */
export const staffRoutes: Routes = [
  { path: '', redirectTo: 'employees', pathMatch: 'full' },
  { path: 'employees', loadComponent: employeeList, title: 'Brasper' },
  { path: 'employees/new', loadComponent: employeeForm, title: 'Brasper', ...canWrite },
  { path: 'employees/:id/edit', loadComponent: employeeForm, title: 'Brasper', ...canWrite },
];
