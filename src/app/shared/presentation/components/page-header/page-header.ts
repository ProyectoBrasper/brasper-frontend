import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** One breadcrumb step; the last one has no link (current page). Labels are already translated. */
export interface Breadcrumb {
  label: string;
  link?: string;
}

/**
 * Page heading (DESIGN.md §2): breadcrumb, title, subtitle and actions projected on the right.
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, MatIconModule],
  template: `
    <header class="header">
      <div class="text">
        @if (breadcrumbs().length) {
          <nav class="breadcrumb" aria-label="Breadcrumb">
            @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
              @if (crumb.link && !last) {
                <a [routerLink]="crumb.link">{{ crumb.label }}</a>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              } @else {
                <span [attr.aria-current]="last ? 'page' : null">{{ crumb.label }}</span>
                @if (!last) {
                  <mat-icon aria-hidden="true">chevron_right</mat-icon>
                }
              }
            }
          </nav>
        }
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }
    .breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .breadcrumb a {
      color: inherit;
      text-decoration: none;
    }
    .breadcrumb a:hover {
      color: var(--mat-sys-primary);
      text-decoration: underline;
    }
    .breadcrumb [aria-current='page'] {
      color: var(--mat-sys-on-surface);
      font-weight: 600;
    }
    .breadcrumb mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    h1 {
      font: 700 26px/34px var(--brasper-font-brand);
      color: var(--mat-sys-on-surface);
    }
    .subtitle {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .actions {
      display: flex;
      gap: 12px;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly breadcrumbs = input<Breadcrumb[]>([]);
}
