import { inject, Injectable, signal } from '@angular/core';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { AccountingApi } from '../infrastructure/accounting-api';

/**
 * Accounting context state. For now only the tax parameters read by the invoice preview; ledger,
 * journal entries, tax returns and fixed assets come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class AccountingStore {
  private readonly accountingApi = inject(AccountingApi);

  private readonly taxParametersSignal = signal<TaxParameters | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  /** Parameters in force on the last requested date; null = none configured (use standard rates). */
  readonly taxParameters = this.taxParametersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  loadTaxParametersAt(date: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.accountingApi.getTaxParametersAt(date).subscribe({
      next: (parameters) => {
        this.taxParametersSignal.set(parameters);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => {
        this.taxParametersSignal.set(null);
        this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load tax parameters');
        this.loadingSignal.set(false);
      },
    });
  }
}
