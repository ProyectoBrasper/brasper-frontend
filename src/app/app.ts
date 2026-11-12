import { Component } from '@angular/core';
import { Layout } from './shared/presentation/components/layout/layout';

/**
 * Root component: renders the application shell.
 */
@Component({
  selector: 'app-root',
  imports: [Layout],
  template: '<app-layout />',
})
export class App {}
