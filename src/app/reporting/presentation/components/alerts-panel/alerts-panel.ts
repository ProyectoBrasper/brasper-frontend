import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { describeAlert } from '../../../domain/services/dashboard-figures';

/** The alerts of the month, each with a link to the report that explains it. */
@Component({
  selector: 'app-alerts-panel',
  imports: [MatIconModule, RouterLink, TranslatePipe],
  template: `
    <section class="panel">
      <h2>{{ 'dashboard.alerts' | translate }}</h2>
      @for (alert of items(); track $index) {
        <p class="alert" role="status">
          <mat-icon aria-hidden="true">warning</mat-icon>
          <span>
            {{ alert.key | translate: alert.params }}
            @if (alert.link) {
              <a [routerLink]="alert.link">{{ 'dashboard.seeReport' | translate }}</a>
            }
          </span>
        </p>
      } @empty {
        <p class="none">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          <span>{{ 'dashboard.noAlerts' | translate }}</span>
        </p>
      }
    </section>
  `,
  styles: `
    .panel {
      height: 100%;
      padding: 20px 24px;
      box-sizing: border-box;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--brasper-radius-lg);
      background: var(--mat-sys-surface);
      box-shadow: var(--brasper-shadow-card);
    }
    h2 { margin: 0 0 12px; font: 700 18px/24px var(--brasper-font-brand); }
    p {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 0 8px;
      padding: 12px;
      border-radius: var(--brasper-radius-md);
      font: var(--mat-sys-body-medium);
    }
    mat-icon { flex: none; width: 20px; height: 20px; font-size: 20px; }
    .alert { background: var(--brasper-warning-container); color: var(--brasper-warning); }
    .none { background: var(--brasper-success-container); color: var(--brasper-success); }
    a { color: inherit; font-weight: 600; white-space: nowrap; }
  `,
})
export class AlertsPanel {
  readonly alerts = input.required<string[]>();
  readonly items = computed(() => this.alerts().map(describeAlert));
}
