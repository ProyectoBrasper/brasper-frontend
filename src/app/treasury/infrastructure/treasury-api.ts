import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { BankAccount } from '../domain/model/bank-account.entity';
import { RegisterAdjustmentCommand, TransferFundsCommand } from '../domain/model/cash-movement.commands';
import { CashMovement } from '../domain/model/cash-movement.entity';
import { OpenBankAccountCommand } from '../domain/model/open-bank-account.command';
import { Partner } from '../domain/model/partner.entity';
import { BankAccountsApiEndpoint } from './bank-accounts-api-endpoint';
import { PartnersApiEndpoint } from './partners-api-endpoint';

/**
 * Treasury context facade: bank accounts (open, movements, adjustments, transfers) and partners. Payables,
 * loans and contributions come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly bankAccountsEndpoint = new BankAccountsApiEndpoint(this.http);
  private readonly partnersEndpoint = new PartnersApiEndpoint(this.http);

  getBankAccounts(): Observable<BankAccount[]> {
    return this.bankAccountsEndpoint.getAll();
  }

  openBankAccount(command: OpenBankAccountCommand): Observable<BankAccount> {
    return this.bankAccountsEndpoint.open(command);
  }

  getBankAccountById(id: number): Observable<BankAccount> {
    return this.bankAccountsEndpoint.getById(id);
  }

  getMovements(bankAccountId: number, year: number, month: number): Observable<CashMovement[]> {
    return this.bankAccountsEndpoint.getMovements(bankAccountId, year, month);
  }

  registerAdjustment(bankAccountId: number, command: RegisterAdjustmentCommand): Observable<BankAccount> {
    return this.bankAccountsEndpoint.adjust(bankAccountId, command);
  }

  transferFunds(command: TransferFundsCommand): Observable<BankAccount> {
    return this.bankAccountsEndpoint.transfer(command);
  }

  getPartners(): Observable<Partner[]> {
    return this.partnersEndpoint.getAll();
  }
}
