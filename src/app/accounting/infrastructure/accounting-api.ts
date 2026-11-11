import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { RegisterFixedAssetCommand } from '../domain/model/fixed-asset.commands';
import { FixedAsset } from '../domain/model/fixed-asset.entity';
import { RegisterJournalEntryCommand, ReverseJournalEntryCommand } from '../domain/model/journal-entry.commands';
import { JournalEntry } from '../domain/model/journal-entry.entity';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount } from '../domain/model/ledger-account.entity';
import { SetTaxParametersCommand } from '../domain/model/tax-parameters.commands';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { PayTaxReturnCommand } from '../domain/model/tax-return.commands';
import { TaxReturn } from '../domain/model/tax-return.entity';
import { TrialBalance } from '../domain/model/trial-balance';
import { FixedAssetsApiEndpoint } from './fixed-assets-api-endpoint';
import { JournalEntriesApiEndpoint } from './journal-entries-api-endpoint';
import { LedgerAccountsApiEndpoint } from './ledger-accounts-api-endpoint';
import { TaxParametersApiEndpoint } from './tax-parameters-api-endpoint';
import { TaxReturnsApiEndpoint } from './tax-returns-api-endpoint';
import { TrialBalanceApiEndpoint } from './trial-balance-api-endpoint';

/**
 * Accounting context facade: the chart of accounts, the journal entries of a month (manual ones and reversals) and the tax
 * parameters that Billing and Expenses read for their amount previews, the trial balance of a month and the tax
 * returns, the history of the tax rates and the fixed assets.
 */
@Injectable({ providedIn: 'root' })
export class AccountingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly taxParametersEndpoint = new TaxParametersApiEndpoint(this.http);
  private readonly ledgerAccountsEndpoint = new LedgerAccountsApiEndpoint(this.http);
  private readonly journalEntriesEndpoint = new JournalEntriesApiEndpoint(this.http);
  private readonly trialBalanceEndpoint = new TrialBalanceApiEndpoint(this.http);
  private readonly taxReturnsEndpoint = new TaxReturnsApiEndpoint(this.http);
  private readonly fixedAssetsEndpoint = new FixedAssetsApiEndpoint(this.http);

  /** Parameters in force on `date` (`yyyy-MM-dd`), or null when none are configured. */
  getTaxParametersAt(date: string): Observable<TaxParameters | null> {
    return this.taxParametersEndpoint.getAt(date);
  }

  getTaxParametersHistory(): Observable<TaxParameters[]> {
    return this.taxParametersEndpoint.getHistory();
  }

  setTaxParameters(command: SetTaxParametersCommand): Observable<TaxParameters> {
    return this.taxParametersEndpoint.set(command);
  }

  getLedgerAccounts(): Observable<LedgerAccount[]> {
    return this.ledgerAccountsEndpoint.getAll();
  }

  createLedgerAccount(command: CreateLedgerAccountCommand): Observable<LedgerAccount> {
    return this.ledgerAccountsEndpoint.createAccount(command);
  }

  getJournalEntries(year: number, month: number): Observable<JournalEntry[]> {
    return this.journalEntriesEndpoint.getByPeriod(year, month);
  }

  registerJournalEntry(command: RegisterJournalEntryCommand): Observable<JournalEntry> {
    return this.journalEntriesEndpoint.register(command);
  }

  reverseJournalEntry(id: number, command: ReverseJournalEntryCommand): Observable<JournalEntry> {
    return this.journalEntriesEndpoint.reverse(id, command);
  }

  getTrialBalance(year: number, month: number): Observable<TrialBalance> {
    return this.trialBalanceEndpoint.getByPeriod(year, month);
  }

  getTaxReturns(): Observable<TaxReturn[]> {
    return this.taxReturnsEndpoint.getHistory();
  }

  prepareTaxReturn(year: number, month: number): Observable<TaxReturn> {
    return this.taxReturnsEndpoint.prepare(year, month);
  }

  payTaxReturn(id: number, command: PayTaxReturnCommand): Observable<TaxReturn> {
    return this.taxReturnsEndpoint.pay(id, command);
  }

  getFixedAssets(): Observable<FixedAsset[]> {
    return this.fixedAssetsEndpoint.getAll();
  }

  registerFixedAsset(command: RegisterFixedAssetCommand): Observable<FixedAsset> {
    return this.fixedAssetsEndpoint.register(command);
  }
}
