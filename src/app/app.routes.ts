import { Routes } from '@angular/router';

const pageNotFound = () =>
  import('./shared/presentation/views/page-not-found/page-not-found').then((m) => m.PageNotFound);

/**
 * Root routes (docs/uml-frontend/00-app.puml). Each bounded context is lazy loaded with
 * `loadChildren` and protected with `authenticationGuard` / `roleGuard` as it is implemented.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', loadComponent: pageNotFound, title: 'Brasper' },
];
