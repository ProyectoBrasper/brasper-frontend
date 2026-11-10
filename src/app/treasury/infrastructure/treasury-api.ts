import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { BankAccount } from '../domain/model/bank-account.entity';
import { RegisterAdjustmentCommand, TransferFundsCommand } from '../domain/model/cash-movement.commands';
import { CashMovement } from '../domain/model/cash-movement.entity';
import { OpenBankAccountCommand } from '../domain/model/open-bank-account.command';
import { PayInstallmentCommand, RegisterLoanCommand, ScheduleInstallmentCommand } from '../domain/model/loan.commands';
import { Loan } from '../domain/model/loan.entity';
import { RegisterContributionCommand, RegisterPartnerCommand } from '../domain/model/partner.commands';
import { Partner } from '../domain/model/partner.entity';
import { BankAccountsApiEndpoint } from './bank-accounts-api-endpoint';
import { LoansApiEndpoint } from './loans-api-endpoint';
import { PartnersApiEndpoint } from './partners-api-endpoint';
import { PayablesApiEndpoint } from './payables-api-endpoint';
import { CashFlowWeek } from '../../shared/domain/model/cash-flow-week';
import { CreatePayableCommand, RegisterPayablePaymentCommand } from '../domain/model/payable.commands';
import { Payable } from '../domain/model/payable.entity';

/**
 * Treasury context facade: bank accounts (open, movements, adjustments, transfers), payables (pay, reschedule),
 * loans (list, register, schedule and pay installments) and partners (register, contributions).
 */
@Injectable({ providedIn: 'root' })
export class TreasuryApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly bankAccountsEndpoint = new BankAccountsApiEndpoint(this.http);
  private readonly partnersEndpoint = new PartnersApiEndpoint(this.http);
  private readonly payablesEndpoint = new PayablesApiEndpoint(this.http);
  private readonly loansEndpoint = new LoansApiEndpoint(this.http);

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

  getPayables(): Observable<Payable[]> {
    return this.payablesEndpoint.getAll();
  }

  createPayable(command: CreatePayableCommand): Observable<Payable> {
    return this.payablesEndpoint.createPayable(command);
  }

  payPayable(id: number, command: RegisterPayablePaymentCommand): Observable<Payable> {
    return this.payablesEndpoint.pay(id, command);
  }

  reschedulePayable(id: number, week: CashFlowWeek): Observable<Payable> {
    return this.payablesEndpoint.reschedule(id, week);
  }

  getLoans(): Observable<Loan[]> {
    return this.loansEndpoint.getAll();
  }

  registerLoan(command: RegisterLoanCommand): Observable<Loan> {
    return this.loansEndpoint.register(command);
  }

  getLoanById(id: number): Observable<Loan> {
    return this.loansEndpoint.getById(id);
  }

  scheduleInstallment(loanId: number, command: ScheduleInstallmentCommand): Observable<Loan> {
    return this.loansEndpoint.scheduleInstallment(loanId, command);
  }

  payInstallment(loanId: number, installmentId: number, command: PayInstallmentCommand): Observable<Loan> {
    return this.loansEndpoint.payInstallment(loanId, installmentId, command);
  }

  getPartners(): Observable<Partner[]> {
    return this.partnersEndpoint.getAll();
  }

  registerPartner(command: RegisterPartnerCommand): Observable<Partner> {
    return this.partnersEndpoint.register(command);
  }

  registerContribution(partnerId: number, command: RegisterContributionCommand): Observable<Partner> {
    return this.partnersEndpoint.registerContribution(partnerId, command);
  }
}
