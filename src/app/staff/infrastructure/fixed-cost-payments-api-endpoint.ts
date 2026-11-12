import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { RegisterFixedCostPaymentCommand } from '../domain/model/fixed-cost.commands';
import { FixedCostPayment } from '../domain/model/fixed-cost-payment.entity';
import { FixedCostPaymentAssembler } from './fixed-cost-assembler';
import { FixedCostPaymentResource, RegisterFixedCostPaymentRequest } from './fixed-cost.resource';

/**
 * Client for fixed cost payments: `GET /fixed-costs/payments?year=&month=` (both required) lists the
 * payments of a month, and `POST /fixed-costs/{id}/payments` registers one.
 */
export class FixedCostPaymentsApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderFixedCostsEndpointPath}`;
  private readonly assembler = new FixedCostPaymentAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getByPeriod(year: number, month: number): Observable<FixedCostPayment[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<FixedCostPaymentResource[]>(`${this.endpointUrl}/payments`, { params }).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to fetch fixed cost payments')),
    );
  }

  register(fixedCostId: number, command: RegisterFixedCostPaymentCommand): Observable<FixedCostPayment> {
    const request: RegisterFixedCostPaymentRequest = {
      paidOn: command.paidOn,
      year: command.year,
      month: command.month,
      amount: command.amount,
      bankAccountId: command.bankAccountId,
      notes: command.notes.trim() || null,
    };
    return this.http.post<FixedCostPaymentResource>(`${this.endpointUrl}/${fixedCostId}/payments`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register fixed cost payment')),
    );
  }
}
