import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { CostEstimate } from '../domain/model/cost-estimate.entity';
import { ProgressRecord } from '../domain/model/progress-record.entity';
import { CostEstimateAssembler, ProgressRecordAssembler } from './project-detail.assemblers';
import { CostEstimateResource, ProgressRecordResource } from './project-detail.resources';

const projectUrl = (projectId: number) =>
  `${environment.platformProviderApiBaseUrl}${environment.platformProviderProjectsEndpointPath}/${projectId}`;

/**
 * Client for `GET/POST /projects/{projectId}/progress`.
 */
export class ProgressRecordsApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly assembler = new ProgressRecordAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getByProjectId(projectId: number): Observable<ProgressRecord[]> {
    return this.http.get<ProgressRecordResource[]>(`${projectUrl(projectId)}/progress`).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource, projectId))),
      catchError(this.handleError('Failed to fetch progress')),
    );
  }

  register(projectId: number, record: ProgressRecord): Observable<ProgressRecord> {
    return this.http
      .post<ProgressRecordResource>(`${projectUrl(projectId)}/progress`, this.assembler.toRequestFromEntity(record))
      .pipe(
        map((resource) => this.assembler.toEntityFromResource(resource, projectId)),
        catchError(this.handleError('Failed to register progress')),
      );
  }
}

/**
 * Client for `GET/PUT /projects/{projectId}/cost-estimates` (PUT creates or replaces by category).
 */
export class CostEstimatesApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly assembler = new CostEstimateAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getByProjectId(projectId: number): Observable<CostEstimate[]> {
    return this.http.get<CostEstimateResource[]>(`${projectUrl(projectId)}/cost-estimates`).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource, projectId))),
      catchError(this.handleError('Failed to fetch cost estimates')),
    );
  }

  set(projectId: number, estimate: CostEstimate, currency: string): Observable<CostEstimate> {
    return this.http
      .put<CostEstimateResource>(
        `${projectUrl(projectId)}/cost-estimates`,
        this.assembler.toRequestFromEntity(estimate, currency),
      )
      .pipe(
        map((resource) => this.assembler.toEntityFromResource(resource, projectId)),
        catchError(this.handleError('Failed to set cost estimate')),
      );
  }
}
