import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { countByType, sortByCode } from '../domain/services/ledger-account-figures';
import { AccountingApi } from '../infrastructure/accounting-api';

/**
 * Accounting context state: the chart of accounts and the tax parameters read by the invoice and expense previews.
 * Journal entries, trial balance, tax returns and fixed assets come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class AccountingStore {
  private readonly accountingApi = inject(AccountingApi);
  private readonly iamStore = inject(IamStore);

  private readonly taxParametersSignal = signal<TaxParameters | null>(null);
  private readonly ledgerAccountsSignal = signal<LedgerAccount[]>([]);
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  /** Parameters in force on the last requested date; null = none configured (use standard rates). */
  readonly taxParameters = this.taxParametersSignal.asReadonly();
  /** The chart of accounts, by code. */
  readonly ledgerAccounts = this.ledgerAccountsSignal.asReadonly();
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Admin and accounting write; management only reads (backend rule). */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.accountingWrite));

  loadTaxParametersAt(date: string): void {
    this.run(
      this.accountingApi.getTaxParametersAt(date),
      'Failed to load tax parameters',
      (parameters) => this.taxParametersSignal.set(parameters),
      () => this.taxParametersSignal.set(null),
    );
  }

  loadLedgerAccounts(): void {
    this.run(this.accountingApi.getLedgerAccounts(), 'Failed to load ledger accounts', (accounts) =>
      this.ledgerAccountsSignal.set(sortByCode(accounts)),
    );
  }

  /** Adds an account to the chart; the backend answers with it (a code already in use is a 409). */
  createLedgerAccount(command: CreateLedgerAccountCommand): void {
    this.run(this.accountingApi.createLedgerAccount(command), 'Failed to create ledger account', (account) =>
      this.ledgerAccountsSignal.update((accounts) => sortByCode([...accounts, account])),
    );
  }

  countLedgerAccountsByType(type: LedgerAccountType | null): number {
    return countByType(this.ledgerAccountsSignal(), type);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private run<T>(request: Observable<T>, fallback: string, onSuccess: (value: T) => void, onError?: () => void): void {
    this.pendingSignal.update((pending) => pending + 1);
    this.errorSignal.set(null);
    request.subscribe({
      next: (value) => {
        onSuccess(value);
        this.pendingSignal.update((pending) => pending - 1);
      },
      error: (error: unknown) => {
        onError?.();
        this.errorSignal.set(error instanceof Error ? error.message : fallback);
        this.pendingSignal.update((pending) => pending - 1);
      },
    });
  }
}
