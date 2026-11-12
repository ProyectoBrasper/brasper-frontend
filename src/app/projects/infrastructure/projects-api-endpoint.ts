import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Project } from '../domain/model/project.entity';
import { ProjectAssembler } from './project-assembler';
import { ProjectResource, ProjectsResponse } from './project.resource';

/**
 * Client for `/projects`: CRUD plus `POST /{id}/start` and `POST /{id}/cancel`.
 */
export class ProjectsApiEndpoint extends BaseApiEndpoint<Project, ProjectResource, ProjectsResponse, ProjectAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderProjectsEndpointPath}`,
      new ProjectAssembler(),
    );
  }

  start(id: number): Observable<Project> {
    return this.transition(id, 'start', 'Failed to start project');
  }

  cancel(id: number): Observable<Project> {
    return this.transition(id, 'cancel', 'Failed to cancel project');
  }

  getByClientId(clientId: number): Observable<Project[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<ProjectResource[] | ProjectsResponse>(this.endpointUrl, { params }).pipe(
      map((response) => this.toEntities(response)),
      catchError(this.handleError('Failed to fetch projects')),
    );
  }

  private transition(id: number, action: 'start' | 'cancel', operation: string): Observable<Project> {
    return this.http.post<ProjectResource>(`${this.endpointUrl}/${id}/${action}`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError(operation)),
    );
  }
}
