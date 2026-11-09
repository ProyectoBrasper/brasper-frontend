import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { CashFlowWeek } from '../../shared/domain/model/cash-flow-week';
import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { CreatePayableCommand, RegisterPayablePaymentCommand } from '../domain/model/payable.commands';
import { Payable, PayableType } from '../domain/model/payable.entity';

/** Backend `PayableResource`. */
export interface PayableResource extends BaseResource {
  concept: string;
  type: string;
  totalAmount: number;
  currency: string;
  paidAmount: number;
  balance: number;
  supplierId: number | null;
  projectId: number | null;
  expenseId: number | null;
  year: number;
  month: number;
  week: number;
  status: string;
}

/** Envelope for a payable collection (the API returns a plain array). */
export interface PayablesResponse extends BaseResponse {
  payables: PayableResource[];
}

/** Body of `POST /payables` (backend `CreatePayableResource`). `expenseId` is always null from the UI. */
export interface CreatePayableRequest {
  concept: string;
  type: string;
  totalAmount: number;
  currency: string;
  supplierId: number | null;
  projectId: number | null;
  expenseId: null;
  year: number;
  month: number;
  week: number;
}

/** Body of `POST /payables/{id}/payments` (backend `RegisterPayablePaymentResource`). */
export interface RegisterPayablePaymentRequest {
  paidOn: string;
  amount: number;
  bankAccountId: number;
}

/** Body of `PUT /payables/{id}/schedule` (backend `ReschedulePayableResource`). */
export interface ReschedulePayableRequest {
  year: number;
  month: number;
  week: number;
}

/** Maps payables from their resource (`Number()` covers BigDecimal sent as a string). */
export class PayableAssembler implements BaseAssembler<Payable, PayableResource, PayablesResponse> {
  toEntitiesFromResponse(response: PayablesResponse): Payable[] {
    return response.payables.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: PayableResource): Payable {
    return new Payable({
      id: resource.id,
      concept: resource.concept,
      type: resource.type as PayableType,
      totalAmount: Number(resource.totalAmount),
      currency: resource.currency,
      paidAmount: Number(resource.paidAmount),
      balance: Number(resource.balance),
      supplierId: resource.supplierId ?? null,
      projectId: resource.projectId ?? null,
      expenseId: resource.expenseId ?? null,
      year: resource.year,
      month: resource.month,
      week: resource.week,
      status: resource.status as PaymentStatus,
    });
  }

  toResourceFromEntity(entity: Payable): PayableResource {
    return {
      id: entity.id,
      concept: entity.concept,
      type: entity.type,
      totalAmount: entity.totalAmount,
      currency: entity.currency,
      paidAmount: entity.paidAmount,
      balance: entity.balance,
      supplierId: entity.supplierId,
      projectId: entity.projectId,
      expenseId: entity.expenseId,
      year: entity.year,
      month: entity.month,
      week: entity.week,
      status: entity.status,
    };
  }
}

/**
 * Client for `/payables` (admin, accounting and management read; admin and accounting write): list (oldest
 * first), get, `POST` creates one by hand, `POST /{id}/payments` pays and `PUT /{id}/schedule` moves it to
 * another cash-flow week.
 */
export class PayablesApiEndpoint extends BaseApiEndpoint<Payable, PayableResource, PayablesResponse, PayableAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderPayablesEndpointPath}`,
      new PayableAssembler(),
    );
  }

  /** `POST /payables`: it starts pending in the chosen cash-flow week. */
  createPayable(command: CreatePayableCommand): Observable<Payable> {
    const request: CreatePayableRequest = {
      concept: command.concept.trim(),
      type: command.type,
      totalAmount: command.totalAmount,
      currency: command.currency,
      supplierId: command.supplierId,
      projectId: command.projectId,
      expenseId: null,
      year: command.week.year,
      month: command.week.month,
      week: command.week.number,
    };
    return this.http.post<PayableResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to create payable')),
    );
  }

  /** The backend answers with the payable and its new paid amount, balance and status. */
  pay(id: number, command: RegisterPayablePaymentCommand): Observable<Payable> {
    const request: RegisterPayablePaymentRequest = {
      paidOn: command.paidOn,
      amount: command.amount,
      bankAccountId: command.bankAccountId,
    };
    return this.http.post<PayableResource>(`${this.endpointUrl}/${id}/payments`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to pay payable')),
    );
  }

  reschedule(id: number, week: CashFlowWeek): Observable<Payable> {
    const request: ReschedulePayableRequest = { year: week.year, month: week.month, week: week.number };
    return this.http.put<PayableResource>(`${this.endpointUrl}/${id}/schedule`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to reschedule payable')),
    );
  }
}
