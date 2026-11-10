import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { TrialBalance, TrialBalanceLine } from '../domain/model/trial-balance';
import { MoneyResource } from './journal-entries-api-endpoint';

/** Backend `TrialBalanceResource.Line`. */
export interface TrialBalanceLineResource {
  accountCode: string;
  accountName: string;
  debit: MoneyResource;
  credit: MoneyResource;
}

/** Backend `TrialBalanceResource`. */
export interface TrialBalanceResource {
  year: number;
  month: number;
  lines: TrialBalanceLineResource[];
}

/** Maps the trial balance (`Number()` covers BigDecimal sent as a string). */
export class TrialBalanceAssembler {
  toEntityFromResource(resource: TrialBalanceResource): TrialBalance {
    return new TrialBalance({
      year: resource.year,
      month: resource.month,
      lines: resource.lines.map(
        (line) =>
          new TrialBalanceLine({
            accountCode: line.accountCode,
            accountName: line.accountName,
            debit: Number(line.debit.amount),
            credit: Number(line.credit.amount),
            currency: line.debit.currency,
          }),
      ),
    });
  }
}

/**
 * Client for `GET /ledger-accounts/trial-balance?year=&month=` (admin, accounting and management): the debit and
 * credit each account moved in that month. It is one read model, not a collection, so it does not extend
 * `BaseApiEndpoint`.
 */
export class TrialBalanceApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl =
    `${environment.platformProviderApiBaseUrl}${environment.platformProviderLedgerAccountsEndpointPath}/trial-balance`;
  private readonly assembler = new TrialBalanceAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getByPeriod(year: number, month: number): Observable<TrialBalance> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<TrialBalanceResource>(this.endpointUrl, { params }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch trial balance')),
    );
  }
}
