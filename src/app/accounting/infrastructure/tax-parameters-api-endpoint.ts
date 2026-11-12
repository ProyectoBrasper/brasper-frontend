import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { SetTaxParametersCommand } from '../domain/model/tax-parameters.commands';
import { TaxParameters } from '../domain/model/tax-parameters.entity';

/** Backend `TaxParametersResource` (rates as fractions). */
export interface TaxParametersResource extends BaseResource {
  effectiveFrom: string;
  igv: number;
  detraction: number;
  retention: number;
  incomeTaxPrepayment: number;
}

/** Maps tax parameters from their resource. */
export class TaxParametersAssembler {
  toEntityFromResource(resource: TaxParametersResource): TaxParameters {
    return new TaxParameters({
      id: resource.id,
      effectiveFrom: resource.effectiveFrom,
      igv: Number(resource.igv),
      detraction: Number(resource.detraction),
      retention: Number(resource.retention),
      incomeTaxPrepayment: Number(resource.incomeTaxPrepayment),
    });
  }
}

/** Body of `POST /tax-parameters` (backend `SetTaxParametersResource`), rates as fractions. */
export interface SetTaxParametersRequest {
  effectiveFrom: string;
  igv: number;
  detraction: number;
  retention: number;
  incomeTaxPrepayment: number;
}

/**
 * Client for `/tax-parameters`: `GET ?date=` (rates in force on a date; the backend answers 404 when none are
 * configured, returned as `null` so callers use the standard rates), `GET /history` (latest effective date first)
 * and `POST` (admin only) for new rates from a date.
 */
export class TaxParametersApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderTaxParametersEndpointPath}`;
  private readonly assembler = new TaxParametersAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getAt(date: string): Observable<TaxParameters | null> {
    const params = new HttpParams().set('date', date);
    return this.http.get<TaxParametersResource>(this.endpointUrl, { params }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of(null) : this.handleError('Failed to fetch tax parameters')(error),
      ),
    );
  }

  getHistory(): Observable<TaxParameters[]> {
    return this.http.get<TaxParametersResource[]>(`${this.endpointUrl}/history`).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to fetch tax parameters history')),
    );
  }

  /** `POST /tax-parameters`: an effective date already used is a 409. */
  set(command: SetTaxParametersCommand): Observable<TaxParameters> {
    const request: SetTaxParametersRequest = {
      effectiveFrom: command.effectiveFrom,
      igv: command.igv,
      detraction: command.detraction,
      retention: command.retention,
      incomeTaxPrepayment: command.incomeTaxPrepayment,
    };
    return this.http.post<TaxParametersResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to set tax parameters')),
    );
  }
}
