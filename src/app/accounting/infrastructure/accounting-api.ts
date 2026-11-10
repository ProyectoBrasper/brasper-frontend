import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount } from '../domain/model/ledger-account.entity';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { LedgerAccountsApiEndpoint } from './ledger-accounts-api-endpoint';
import { TaxParametersApiEndpoint } from './tax-parameters-api-endpoint';

/**
 * Accounting context facade: the chart of accounts and the tax parameters that Billing and Expenses read for their
 * amount previews. Journal entries, trial balance, tax returns and fixed assets come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class AccountingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly taxParametersEndpoint = new TaxParametersApiEndpoint(this.http);
  private readonly ledgerAccountsEndpoint = new LedgerAccountsApiEndpoint(this.http);

  /** Parameters in force on `date` (`yyyy-MM-dd`), or null when none are configured. */
  getTaxParametersAt(date: string): Observable<TaxParameters | null> {
    return this.taxParametersEndpoint.getAt(date);
  }

  getLedgerAccounts(): Observable<LedgerAccount[]> {
    return this.ledgerAccountsEndpoint.getAll();
  }

  createLedgerAccount(command: CreateLedgerAccountCommand): Observable<LedgerAccount> {
    return this.ledgerAccountsEndpoint.createAccount(command);
  }
}
