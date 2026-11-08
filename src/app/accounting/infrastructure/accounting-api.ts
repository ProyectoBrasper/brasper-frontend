import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { TaxParametersApiEndpoint } from './tax-parameters-api-endpoint';

/**
 * Accounting context facade. For now only the tax parameters that Billing and Expenses read for
 * their amount previews; the rest of the module comes with its screens.
 */
@Injectable({ providedIn: 'root' })
export class AccountingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly taxParametersEndpoint = new TaxParametersApiEndpoint(this.http);

  /** Parameters in force on `date` (`yyyy-MM-dd`), or null when none are configured. */
  getTaxParametersAt(date: string): Observable<TaxParameters | null> {
    return this.taxParametersEndpoint.getAt(date);
  }
}
