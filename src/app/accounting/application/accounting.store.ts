import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Period } from '../../shared/domain/model/period';
import { RegisterFixedAssetCommand } from '../domain/model/fixed-asset.commands';
import { FixedAsset } from '../domain/model/fixed-asset.entity';
import { RegisterJournalEntryCommand, ReverseJournalEntryCommand } from '../domain/model/journal-entry.commands';
import { JournalEntry } from '../domain/model/journal-entry.entity';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';
import { SetTaxParametersCommand } from '../domain/model/tax-parameters.commands';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { PayTaxReturnCommand } from '../domain/model/tax-return.commands';
import { TaxReturn } from '../domain/model/tax-return.entity';
import { TrialBalance } from '../domain/model/trial-balance';
import { countByType, sortByCode } from '../domain/services/ledger-account-figures';
import { AccountingApi } from '../infrastructure/accounting-api';

/**
 * Accounting context state: the chart of accounts, the journal entries and the trial balance of a month, the tax
 * returns, the tax parameters read by the invoice and expense previews and their history, and the fixed assets.
 */
@Injectable({ providedIn: 'root' })
export class AccountingStore {
  private readonly accountingApi = inject(AccountingApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly taxParametersSignal = signal<TaxParameters | null>(null);
  private readonly taxParametersHistorySignal = signal<TaxParameters[]>([]);
  private readonly ledgerAccountsSignal = signal<LedgerAccount[]>([]);
  private readonly journalEntriesSignal = signal<JournalEntry[]>([]);
  private readonly trialBalanceSignal = signal<TrialBalance | null>(null);
  private readonly taxReturnsSignal = signal<TaxReturn[]>([]);
  private readonly fixedAssetsSignal = signal<FixedAsset[]>([]);
  /** Month of the trial balance shown (to drop late answers). */
  private trialBalancePeriod: Period | null = null;
  /** Month whose entries are shown (to drop late answers and reload after a reversal). */
  private journalPeriod: Period | null = null;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  /** Parameters in force on the last requested date; null = none configured (use standard rates). */
  readonly taxParameters = this.taxParametersSignal.asReadonly();
  /** Every set of rates, latest effective date first (the backend history). */
  readonly taxParametersHistory = this.taxParametersHistorySignal.asReadonly();
  /** The chart of accounts, by code. */
  readonly ledgerAccounts = this.ledgerAccountsSignal.asReadonly();
  /** Entries of the shown month, by date and number (as the backend returns them). */
  readonly journalEntries = this.journalEntriesSignal.asReadonly();
  /** Trial balance of the shown month; null while it loads. */
  readonly trialBalance = this.trialBalanceSignal.asReadonly();
  /** Every tax return, latest first (the backend history). */
  readonly taxReturns = this.taxReturnsSignal.asReadonly();
  /** Every fixed asset, disposed ones included. */
  readonly fixedAssets = this.fixedAssetsSignal.asReadonly();
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Admin and accounting write; management only reads (backend rule). */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.accountingWrite));
  /** Only an admin sets new tax rates (backend rule). */
  readonly canSetTaxParameters = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.taxParametersWrite));

  loadTaxParametersAt(date: string): void {
    this.run(
      this.accountingApi.getTaxParametersAt(date),
      'Failed to load tax parameters',
      (parameters) => this.taxParametersSignal.set(parameters),
      () => this.taxParametersSignal.set(null),
    );
  }

  loadTaxParametersHistory(): void {
    this.run(this.accountingApi.getTaxParametersHistory(), 'Failed to load tax parameters', (history) =>
      this.taxParametersHistorySignal.set(history),
    );
  }

  /** Adds new rates from a date; the backend answers with the new row (a date already used is a 409). */
  setTaxParameters(command: SetTaxParametersCommand, onSaved?: () => void): void {
    this.run(this.accountingApi.setTaxParameters(command), 'Failed to set tax parameters', (parameters) => {
      this.taxParametersHistorySignal.update((history) =>
        [...history, parameters].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)),
      );
      onSaved?.();
    });
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

  loadTaxReturns(): void {
    this.run(this.accountingApi.getTaxReturns(), 'Failed to load tax returns', (returns) => this.taxReturnsSignal.set(returns));
  }

  /** Prepares the return of a month; its figures come from the journal of that month and stay fixed. */
  prepareTaxReturn(period: Period): void {
    this.run(this.accountingApi.prepareTaxReturn(period.year, period.month), 'Failed to prepare tax return', (taxReturn) =>
      this.upsertTaxReturn(taxReturn),
    );
  }

  /**
   * Pays a return. The backend posts its entry and takes the cash out of the chosen account, so `onPaid` lets the
   * caller re-read the balances (they belong to Treasury).
   */
  payTaxReturn(id: number, command: PayTaxReturnCommand, onPaid?: () => void): void {
    this.run(this.accountingApi.payTaxReturn(id, command), 'Failed to pay tax return', (taxReturn) => {
      this.upsertTaxReturn(taxReturn);
      onPaid?.();
    });
  }

  loadFixedAssets(): void {
    this.run(this.accountingApi.getFixedAssets(), 'Failed to load fixed assets', (assets) => this.fixedAssetsSignal.set(assets));
  }

  /** Registers an asset and goes back to the list; the backend adds the IGV and posts the acquisition entry. */
  registerFixedAsset(command: RegisterFixedAssetCommand): void {
    this.run(this.accountingApi.registerFixedAsset(command), 'Failed to register fixed asset', (asset) => {
      this.fixedAssetsSignal.update((assets) => [...assets, asset]);
      void this.router.navigate(['/accounting/fixed-assets']);
    });
  }

  /** The account of a code, for the name shown next to it (undefined while the chart loads). */
  getLedgerAccountByCode(code: string): LedgerAccount | undefined {
    return this.ledgerAccountsSignal().find((account) => account.code === code);
  }

  countLedgerAccountsByType(type: LedgerAccountType | null): number {
    return countByType(this.ledgerAccountsSignal(), type);
  }

  private upsertTaxReturn(taxReturn: TaxReturn): void {
    this.taxReturnsSignal.update((returns) =>
      [...returns.filter((r) => r.id !== taxReturn.id), taxReturn].sort(
        (a, b) => b.year - a.year || b.month - a.month,
      ),
    );
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
