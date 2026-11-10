import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Period } from '../../shared/domain/model/period';
import { RegisterJournalEntryCommand, ReverseJournalEntryCommand } from '../domain/model/journal-entry.commands';
import { JournalEntry } from '../domain/model/journal-entry.entity';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { TrialBalance } from '../domain/model/trial-balance';
import { countByType, sortByCode } from '../domain/services/ledger-account-figures';
import { AccountingApi } from '../infrastructure/accounting-api';

/**
 * Accounting context state: the chart of accounts, the journal entries and the trial balance of a month, and the tax
 * parameters read by the invoice and expense previews. Tax returns and fixed assets come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class AccountingStore {
  private readonly accountingApi = inject(AccountingApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly taxParametersSignal = signal<TaxParameters | null>(null);
  private readonly ledgerAccountsSignal = signal<LedgerAccount[]>([]);
  private readonly journalEntriesSignal = signal<JournalEntry[]>([]);
  private readonly trialBalanceSignal = signal<TrialBalance | null>(null);
  /** Month of the trial balance shown (to drop late answers). */
  private trialBalancePeriod: Period | null = null;
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
  /** Trial balance of the shown month; null while it loads. */
  readonly trialBalance = this.trialBalanceSignal.asReadonly();
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
   * Registers a manual entry and opens the journal in the entry's month with it expanded, since its date may fall in
   * any month.
   */
  registerJournalEntry(command: RegisterJournalEntryCommand): void {
    this.run(this.accountingApi.registerJournalEntry(command), 'Failed to register journal entry', (entry) => {
      void this.router.navigate(['/accounting/journal-entries'], {
        queryParams: { year: entry.year, month: entry.month, open: entry.id },
      });
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

  /** Loads what every account moved in one month. */
  loadTrialBalance(period: Period): void {
    this.trialBalancePeriod = period;
    this.trialBalanceSignal.set(null);
    this.run(this.accountingApi.getTrialBalance(period.year, period.month), 'Failed to load trial balance', (balance) => {
      // Ignore a late answer for a month the user already left.
      if (this.trialBalancePeriod === period) {
        this.trialBalanceSignal.set(balance);
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
