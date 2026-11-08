import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
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

/**
 * Client for `GET /tax-parameters?date=` (rates in force on a date). The backend answers 404 when
 * no parameters are configured; that is returned as `null` (callers then use the standard rates).
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
}
