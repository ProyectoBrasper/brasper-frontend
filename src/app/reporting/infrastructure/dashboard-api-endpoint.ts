import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { Dashboard } from '../domain/model/dashboard';

/** Backend `DashboardResource`. */
export interface DashboardResource {
  cashBalance: number;
  receivablesOutstanding: number;
  payablesOutstanding: number;
  netProfitYtd: number;
  projectedClosingBalance: number;
  projectsInProgress: number;
  alerts: string[];
}

/** Maps the dashboard from its resource (`Number()` covers BigDecimal sent as a string). */
export class DashboardAssembler {
  toEntityFromResource(resource: DashboardResource): Dashboard {
    return new Dashboard({
      cashBalance: Number(resource.cashBalance),
      receivablesOutstanding: Number(resource.receivablesOutstanding),
      payablesOutstanding: Number(resource.payablesOutstanding),
      netProfitYtd: Number(resource.netProfitYtd),
      projectedClosingBalance: Number(resource.projectedClosingBalance),
      projectsInProgress: resource.projectsInProgress,
      alerts: resource.alerts,
    });
  }
}

/** Client for `GET /reports/dashboard` (admin, management and accounting; an engineer gets a 403). */
export class DashboardApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderReportsEndpointPath}/dashboard`;
  private readonly assembler = new DashboardAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getDashboard(year: number, month: number): Observable<Dashboard> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<DashboardResource>(this.endpointUrl, { params }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch dashboard')),
    );
  }
}
