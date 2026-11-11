import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { ProjectProfitability } from '../domain/model/project-profitability';

/** Backend `ProjectProfitabilityResource`. */
export interface ProjectProfitabilityResource {
  projectId: number;
  code: string;
  name: string;
  clientName: string | null;
  status: string;
  currency: string;
  budget: number;
  estimatedCost: number;
  actualCost: number;
  actualCostByCategory: Readonly<Record<string, number>>;
  costDeviation: number;
  salesCommission: number;
  grossProfit: number;
  margin: number;
  accumulatedProgress: number;
  recognizedProfitInPeriod: number;
  invoiced: number;
  collected: number;
}

/** Maps a project's profitability (`Number()` covers BigDecimal sent as a string). */
export class ProjectProfitabilityAssembler {
  toEntityFromResource(resource: ProjectProfitabilityResource): ProjectProfitability {
    return new ProjectProfitability({
      projectId: resource.projectId,
      code: resource.code,
      name: resource.name,
      clientName: resource.clientName,
      status: resource.status,
      currency: resource.currency,
      budget: Number(resource.budget),
      estimatedCost: Number(resource.estimatedCost),
      actualCost: Number(resource.actualCost),
      actualCostByCategory: Object.fromEntries(
        Object.entries(resource.actualCostByCategory).map(([category, amount]) => [category, Number(amount)]),
      ),
      costDeviation: Number(resource.costDeviation),
      salesCommission: Number(resource.salesCommission),
      grossProfit: Number(resource.grossProfit),
      margin: Number(resource.margin),
      accumulatedProgress: Number(resource.accumulatedProgress),
      recognizedProfitInPeriod: Number(resource.recognizedProfitInPeriod),
      invoiced: Number(resource.invoiced),
      collected: Number(resource.collected),
    });
  }
}

/**
 * Client for `GET /reports/projects/profitability` (admin, management and accounting): every project, whatever its
 * status. Each row already carries its detail, so `/{id}/profitability` is not needed.
 */
export class ProjectProfitabilityApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderReportsEndpointPath}/projects/profitability`;
  private readonly assembler = new ProjectProfitabilityAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  /** The month only decides the profit recognized by that month's progress. */
  getPortfolio(year: number, month: number): Observable<ProjectProfitability[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<ProjectProfitabilityResource[]>(this.endpointUrl, { params }).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to fetch project profitability')),
    );
  }
}
