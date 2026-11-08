import { PercentPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TaxRates } from '../../../domain/services/invoice-amounts-calculator';

/**
 * Invoice amounts: base, IGV, total, retention and detraction (shown as deductions) and the net
 * amount to be deposited. Used for the issue preview and in the invoice detail.
 */
@Component({
  selector: 'app-invoice-amounts-summary',
  imports: [MatIconModule, MoneyPipe, PercentPipe, TranslatePipe],
  template: `
    <dl class="amounts">
      <dt>{{ 'invoices.taxableBase' | translate }}</dt>
      <dd class="amount">{{ taxableBase() | money: currency() }}</dd>
      <dt>{{ 'invoices.igv' | translate }}@if (rates(); as r) { ({{ r.igv | percent: '1.0-2' }})}</dt>
      <dd class="amount">{{ igv() | money: currency() }}</dd>
      <dt class="strong total">{{ 'invoices.total' | translate }}</dt>
      <dd class="amount strong total">{{ total() | money: currency() }}</dd>
      <dt>{{ 'invoices.retention' | translate }}@if (rates(); as r) { ({{ r.retention | percent: '1.0-2' }})}</dt>
      <dd class="amount deduction">{{ retention() ? '− ' + (retention() | money: currency()) : '—' }}</dd>
      <dt>{{ 'invoices.detraction' | translate }}@if (rates(); as r) { ({{ r.detraction | percent: '1.0-2' }})}</dt>
      <dd class="amount deduction">{{ detraction() ? '− ' + (detraction() | money: currency()) : '—' }}</dd>
    </dl>
    <div class="net">
      <span class="net-label">{{ 'invoices.netAmount' | translate }}</span>
      <span class="net-value amount">{{ netAmount() | money: currency() }}</span>
    </div>
  `,
  styles: `
    .amounts {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px 16px;
      margin: 0 0 16px;
    }
    dt { color: var(--mat-sys-on-surface-variant); }
    dd { margin: 0; text-align: right; }
    .strong { font-weight: 700; color: var(--mat-sys-on-surface); }
    .total { padding-top: 10px; border-top: 1px solid var(--mat-sys-outline-variant); }
    .deduction { color: var(--mat-sys-error); }
    .net {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--brasper-radius-md);
      background: var(--mat-sys-surface);
    }
    .net-label {
      font: var(--mat-sys-label-small);
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }
    .net-value { font: 700 24px/32px var(--brasper-font-brand); color: var(--mat-sys-primary); }
  `,
})
export class InvoiceAmountsSummary {
  readonly taxableBase = input.required<number>();
  readonly igv = input.required<number>();
  readonly total = input.required<number>();
  readonly retention = input.required<number>();
  readonly detraction = input.required<number>();
  readonly netAmount = input.required<number>();
  readonly currency = input<string>('PEN');
  /** Rates to show next to the labels (optional). */
  readonly rates = input<TaxRates | null>(null);
}
