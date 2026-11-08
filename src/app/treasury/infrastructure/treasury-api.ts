import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { BankAccount } from '../domain/model/bank-account.entity';
import { BankAccountsApiEndpoint } from './bank-accounts-api-endpoint';

/**
 * Treasury context facade. For now only the bank accounts that Billing (collections) and Expenses
 * need; the rest of the module comes with its screens.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly bankAccountsEndpoint = new BankAccountsApiEndpoint(this.http);

  getBankAccounts(): Observable<BankAccount[]> {
    return this.bankAccountsEndpoint.getAll();
  }
}
