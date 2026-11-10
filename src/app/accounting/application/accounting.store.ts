import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Period } from '../../shared/domain/model/period';
import { ReverseJournalEntryCommand } from '../domain/model/journal-entry.commands';
import { JournalEntry } from '../domain/model/journal-entry.entity';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { countByType, sortByCode } from '../domain/services/ledger-account-figures';
import { AccountingApi } from '../infrastructure/accounting-api';

/**
 * Accounting context state: the chart of accounts, the journal entries of a month and the tax parameters read by the
 * invoice and expense previews. Trial balance, tax returns and fixed assets come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class AccountingStore {
  private readonly accountingApi = inject(AccountingApi);
  private readonly iamStore = inject(IamStore);

  private readonly taxParametersSignal = signal<TaxParameters | null>(null);
  private readonly ledgerAccountsSignal = signal<LedgerAccount[]>([]);
  private readonly journalEntriesSignal = signal<JournalEntry[]>([]);
  /** Month whose entries are shown (to drop late answers and reload after a reversal). */
  private journalPeriod: Period | null = null;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  /** Parameters in force on the last requested date; null = none configured (use standard rates). */
  readonly taxParameters = this.taxParametersSignal.asReadonly();
  /** The chart of accounts, by code. */
  readonly ledgerAccounts = this.ledgerAccountsSignal.asReadonly();
  /** Entries of the shown month, by date and number (as the backend returns them). */
  readonly journalEntries = this.journalEntriesSignal.asReadonly();
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

  /** Loads the entries of one month. */
  loadJournalEntries(period: Period): void {
    this.journalPeriod = period;
    this.journalEntriesSignal.set([]);
    this.run(this.accountingApi.getJournalEntries(period.year, period.month), 'Failed to load journal entries', (entries) => {
      // Ignore a late answer for a month the user already left.
      if (this.journalPeriod === period) {
        this.journalEntriesSignal.set(entries);
      }
    });
  }

  /**
   * Reverses an entry. The backend answers with the new reversal (which may fall in another month) and marks the
   * original as reversed, so the shown month is read again.
   */
  reverseJournalEntry(id: number, command: ReverseJournalEntryCommand): void {
    this.run(this.accountingApi.reverseJournalEntry(id, command), 'Failed to reverse journal entry', () => {
      if (this.journalPeriod) {
        this.loadJournalEntries(this.journalPeriod);
      }
    });
  }

  /** The account of a code, for the name shown next to it (undefined while the chart loads). */
  getLedgerAccountByCode(code: string): LedgerAccount | undefined {
    return this.ledgerAccountsSignal().find((account) => account.code === code);
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
