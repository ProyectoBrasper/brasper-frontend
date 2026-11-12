import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { PayTaxReturnCommand } from '../domain/model/tax-return.commands';
import { TaxReturn, TaxReturnStatus } from '../domain/model/tax-return.entity';
import { MoneyResource } from './journal-entries-api-endpoint';

/** Backend `TaxReturnResource`. */
export interface TaxReturnResource {
  id: number;
  year: number;
  month: number;
  outputIgv: MoneyResource;
  inputIgv: MoneyResource;
  carriedCredit: MoneyResource;
  igvPayable: MoneyResource;
  incomeTaxPrepayment: MoneyResource;
  totalPayable: MoneyResource;
  status: string;
  paidOn: string | null;
  bankAccountId: number | null;
}

/** Body of `POST /tax-returns` (backend `PrepareTaxReturnResource`). */
export interface PrepareTaxReturnRequest {
  year: number;
  month: number;
}

/** Body of `POST /tax-returns/{id}/payment` (backend `PayTaxReturnResource`). */
export interface PayTaxReturnRequest {
  paidOn: string;
  bankAccountId: number;
}

/** Maps tax returns (`Number()` covers BigDecimal sent as a string). */
export class TaxReturnAssembler {
  toEntityFromResource(resource: TaxReturnResource): TaxReturn {
    return new TaxReturn({
      id: resource.id,
      year: resource.year,
      month: resource.month,
      outputIgv: Number(resource.outputIgv.amount),
      inputIgv: Number(resource.inputIgv.amount),
      carriedCredit: Number(resource.carriedCredit.amount),
      igvPayable: Number(resource.igvPayable.amount),
      incomeTaxPrepayment: Number(resource.incomeTaxPrepayment.amount),
      totalPayable: Number(resource.totalPayable.amount),
      currency: resource.totalPayable.currency,
      status: resource.status as TaxReturnStatus,
      paidOn: resource.paidOn ?? null,
      bankAccountId: resource.bankAccountId ?? null,
    });
  }
}

/**
 * Client for `/tax-returns` (admin, accounting and management read; admin and accounting write): the history (latest
 * first), `POST` to prepare the return of a month and `POST /{id}/payment`. The screen reads the history, which has
 * the month shown and the one before.
 */
export class TaxReturnsApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderTaxReturnsEndpointPath}`;
  private readonly assembler = new TaxReturnAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getHistory(): Observable<TaxReturn[]> {
    return this.http.get<TaxReturnResource[]>(`${this.endpointUrl}/history`).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to fetch tax returns')),
    );
  }

  /** `POST /tax-returns`: a month already prepared is a 409. It starts as a draft with its figures fixed. */
  prepare(year: number, month: number): Observable<TaxReturn> {
    const request: PrepareTaxReturnRequest = { year, month };
    return this.http.post<TaxReturnResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to prepare tax return')),
    );
  }

  /** `POST /tax-returns/{id}/payment`: answers with the paid return (already paid is a 409). */
  pay(id: number, command: PayTaxReturnCommand): Observable<TaxReturn> {
    const request: PayTaxReturnRequest = { paidOn: command.paidOn, bankAccountId: command.bankAccountId };
    return this.http.post<TaxReturnResource>(`${this.endpointUrl}/${id}/payment`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to pay tax return')),
    );
  }
}
