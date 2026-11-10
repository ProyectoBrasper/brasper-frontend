import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { PayInstallmentCommand, RegisterLoanCommand, ScheduleInstallmentCommand } from '../domain/model/loan.commands';
import { Loan, LoanInstallment, LoanType } from '../domain/model/loan.entity';

/** Backend `LoanResource.InstallmentResource`. */
export interface LoanInstallmentResource extends BaseResource {
  dueOn: string;
  principal: number;
  interest: number;
  paid: boolean;
  paidOn: string | null;
}

/** Backend `LoanResource`: the installments come inside the loan, there is no endpoint to list them apart. */
export interface LoanResource extends BaseResource {
  type: string;
  counterparty: string;
  principal: number;
  currency: string;
  /** A fraction: 0.12 = 12 %. */
  interestRate: number;
  disbursedOn: string;
  bankAccountId: number;
  totalInterest: number;
  outstandingBalance: number;
  status: string;
  installments: LoanInstallmentResource[];
}

/** Envelope for a loan collection (the API returns a plain array). */
export interface LoansResponse extends BaseResponse {
  loans: LoanResource[];
}

/** Body of `POST /loans` (backend `RegisterLoanResource`). */
export interface RegisterLoanRequest {
  type: string;
  counterparty: string;
  principal: number;
  currency: string;
  interestRate: number;
  disbursedOn: string;
  bankAccountId: number;
}

/** Body of `POST /loans/{id}/installments` (backend `ScheduleInstallmentResource`). */
export interface ScheduleInstallmentRequest {
  dueOn: string;
  principal: number;
  interest: number;
}

/** Body of `POST /loans/{id}/installments/{installmentId}/payments` (backend `PayInstallmentResource`). */
export interface PayInstallmentRequest {
  paidOn: string;
  bankAccountId: number;
}

/** Maps loans and their installments (`Number()` covers BigDecimal sent as a string). */
export class LoanAssembler implements BaseAssembler<Loan, LoanResource, LoansResponse> {
  toEntitiesFromResponse(response: LoansResponse): Loan[] {
    return response.loans.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: LoanResource): Loan {
    return new Loan({
      id: resource.id,
      type: resource.type as LoanType,
      counterparty: resource.counterparty,
      principal: Number(resource.principal),
      currency: resource.currency,
      interestRate: Number(resource.interestRate),
      disbursedOn: resource.disbursedOn,
      bankAccountId: resource.bankAccountId,
      totalInterest: Number(resource.totalInterest),
      outstandingBalance: Number(resource.outstandingBalance),
      status: resource.status as PaymentStatus,
      installments: (resource.installments ?? []).map(
        (installment) =>
          new LoanInstallment({
            id: installment.id,
            dueOn: installment.dueOn,
            principal: Number(installment.principal),
            interest: Number(installment.interest),
            paid: installment.paid,
            paidOn: installment.paidOn ?? null,
          }),
      ),
    });
  }

  toResourceFromEntity(entity: Loan): LoanResource {
    return {
      id: entity.id,
      type: entity.type,
      counterparty: entity.counterparty,
      principal: entity.principal,
      currency: entity.currency,
      interestRate: entity.interestRate,
      disbursedOn: entity.disbursedOn,
      bankAccountId: entity.bankAccountId,
      totalInterest: entity.totalInterest,
      outstandingBalance: entity.outstandingBalance,
      status: entity.status,
      installments: entity.installments.map((installment) => ({
        id: installment.id,
        dueOn: installment.dueOn,
        principal: installment.principal,
        interest: installment.interest,
        paid: installment.paid,
        paidOn: installment.paidOn,
      })),
    };
  }
}

/**
 * Client for `/loans` (admin, accounting and management read; admin and accounting write): list, get, `POST` (posts
 * the disbursement in the chosen account) and the installments, which are scheduled and paid with `POST`s that
 * answer with the whole loan (there is no endpoint that lists installments apart).
 */
export class LoansApiEndpoint extends BaseApiEndpoint<Loan, LoanResource, LoansResponse, LoanAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderLoansEndpointPath}`,
      new LoanAssembler(),
    );
  }

  /** `POST /loans`: it starts pending, without installments. */
  register(command: RegisterLoanCommand): Observable<Loan> {
    const request: RegisterLoanRequest = {
      type: command.type,
      counterparty: command.counterparty.trim(),
      principal: command.principal,
      currency: command.currency,
      interestRate: command.interestRate,
      disbursedOn: command.disbursedOn,
      bankAccountId: command.bankAccountId,
    };
    return this.http.post<LoanResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register loan')),
    );
  }

  /** `POST /loans/{id}/installments`: answers with the loan and its new installment. */
  scheduleInstallment(loanId: number, command: ScheduleInstallmentCommand): Observable<Loan> {
    const request: ScheduleInstallmentRequest = {
      dueOn: command.dueOn,
      principal: command.principal,
      interest: command.interest,
    };
    return this.http.post<LoanResource>(`${this.endpointUrl}/${loanId}/installments`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to schedule installment')),
    );
  }

  /** `POST /loans/{id}/installments/{installmentId}/payments`: answers with the loan, its balance and status. */
  payInstallment(loanId: number, installmentId: number, command: PayInstallmentCommand): Observable<Loan> {
    const request: PayInstallmentRequest = { paidOn: command.paidOn, bankAccountId: command.bankAccountId };
    return this.http
      .post<LoanResource>(`${this.endpointUrl}/${loanId}/installments/${installmentId}/payments`, request)
      .pipe(
        map((resource) => this.assembler.toEntityFromResource(resource)),
        catchError(this.handleError('Failed to pay installment')),
      );
  }
}
