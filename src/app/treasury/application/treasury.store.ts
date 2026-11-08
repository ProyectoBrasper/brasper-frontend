import { inject, Injectable, signal } from '@angular/core';
import { BankAccount } from '../domain/model/bank-account.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';

/**
 * Treasury context state. For now only the bank accounts used by other contexts; payables, loans
 * and partners come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryStore {
  private readonly treasuryApi = inject(TreasuryApi);

  private readonly bankAccountsSignal = signal<BankAccount[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly bankAccounts = this.bankAccountsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  loadBankAccounts(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.treasuryApi.getBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccountsSignal.set(accounts);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load bank accounts');
        this.loadingSignal.set(false);
      },
    });
  }

  getBankAccountById(id: number | null): BankAccount | undefined {
    return id === null ? undefined : this.bankAccountsSignal().find((account) => account.id === id);
  }
}
