import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { StatementRow } from '../../../domain/services/statement-figures';

/** One block of a statement: its lines and their total. */
@Component({
  selector: 'app-statement-section',
  imports: [TranslatePipe, MoneyPipe],
  template: `
    <section class="section">
      <h2>{{ title() }}</h2>
      <table>
        <tbody>
          @for (row of rows(); track row.label) {
            <tr>
              <th scope="row">
                @if (row.code) {
                  <span class="code mono">{{ row.code }}</span>
                }
                {{ row.label }}
              </th>
              <td>{{ row.amount | money }}</td>
            </tr>
          } @empty {
            <tr>
              <td class="empty" colspan="2">{{ 'balanceSheet.empty' | translate }}</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{{ totalLabel() }}</th>
            <td>{{ total() | money }}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  `,
  styles: `
    .section {
      padding: 20px 24px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--brasper-radius-lg);
      background: var(--mat-sys-surface);
      box-shadow: var(--brasper-shadow-card);
    }
    h2 { margin: 0 0 12px; font: 700 18px/24px var(--brasper-font-brand); }
    table { width: 100%; border-collapse: collapse; font: var(--mat-sys-body-medium); }
    th, td { padding: 8px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    th { font-weight: 400; text-align: left; }
    td { text-align: right; white-space: nowrap; padding-left: 16px; }
    .code { display: inline-block; min-width: 56px; color: var(--mat-sys-on-surface-variant); }
    .empty { padding: 16px 0; text-align: center; color: var(--mat-sys-on-surface-variant); }
    tfoot th, tfoot td { border-bottom: none; font-weight: 700; }
  `,
})
export class StatementSection {
  readonly title = input.required<string>();
  readonly rows = input.required<StatementRow[]>();
  readonly total = input.required<number>();
  readonly totalLabel = input.required<string>();
}
