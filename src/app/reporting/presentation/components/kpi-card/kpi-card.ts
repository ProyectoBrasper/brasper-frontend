import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** One headline figure: its name, its value already formatted and when it applies. */
@Component({
  selector: 'app-kpi-card',
  imports: [MatIconModule],
  template: `
    <article class="card">
      <p class="label">
        <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
        {{ label() }}
      </p>
      <p class="value" [class.negative]="negative()">{{ value() }}</p>
      <p class="hint">{{ hint() }}</p>
    </article>
  `,
  styles: `
    .card {
      height: 100%;
      padding: 16px 20px;
      box-sizing: border-box;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--brasper-radius-lg);
      background: var(--mat-sys-surface);
      box-shadow: var(--brasper-shadow-card);
    }
    p { margin: 0; }
    .label {
      display: flex;
      align-items: center;
      gap: 6px;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    mat-icon { flex: none; width: 18px; height: 18px; font-size: 18px; }
    .value { margin: 8px 0 4px; font: 700 22px/28px var(--brasper-font-brand); white-space: nowrap; }
    .value.negative { color: var(--brasper-danger); }
    .hint { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input.required<string>();
  readonly icon = input.required<string>();
  readonly negative = input(false);
}
