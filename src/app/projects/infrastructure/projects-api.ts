import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Client } from '../domain/model/client.entity';
import { Project } from '../domain/model/project.entity';
import { ClientsApiEndpoint } from './clients-api-endpoint';
import { CostEstimate } from '../domain/model/cost-estimate.entity';
import { ProgressRecord } from '../domain/model/progress-record.entity';
import { CostEstimatesApiEndpoint, ProgressRecordsApiEndpoint } from './project-detail-api-endpoints';
import { ProjectsApiEndpoint } from './projects-api-endpoint';

/**
 * Projects context facade over its endpoints: clients, projects, progress and cost estimates.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly clientsEndpoint = new ClientsApiEndpoint(this.http);
  private readonly projectsEndpoint = new ProjectsApiEndpoint(this.http);
  private readonly progressRecordsEndpoint = new ProgressRecordsApiEndpoint(this.http);
  private readonly costEstimatesEndpoint = new CostEstimatesApiEndpoint(this.http);

  getClients(): Observable<Client[]> {
    return this.clientsEndpoint.getAll();
  }

  getClientById(id: number): Observable<Client> {
    return this.clientsEndpoint.getById(id);
  }

  createClient(client: Client): Observable<Client> {
    return this.clientsEndpoint.create(client);
  }

  updateClient(client: Client): Observable<Client> {
    return this.clientsEndpoint.update(client, client.id);
  }

  getProjects(): Observable<Project[]> {
    return this.projectsEndpoint.getAll();
  }

  getProjectById(id: number): Observable<Project> {
    return this.projectsEndpoint.getById(id);
  }

  createProject(project: Project): Observable<Project> {
    return this.projectsEndpoint.create(project);
  }

  updateProject(project: Project): Observable<Project> {
    return this.projectsEndpoint.update(project, project.id);
  }

  startProject(id: number): Observable<Project> {
    return this.projectsEndpoint.start(id);
  }

  cancelProject(id: number): Observable<Project> {
    return this.projectsEndpoint.cancel(id);
  }

  getProgressRecords(projectId: number): Observable<ProgressRecord[]> {
    return this.progressRecordsEndpoint.getByProjectId(projectId);
  }

  registerProgress(projectId: number, record: ProgressRecord): Observable<ProgressRecord> {
    return this.progressRecordsEndpoint.register(projectId, record);
  }

  getCostEstimates(projectId: number): Observable<CostEstimate[]> {
    return this.costEstimatesEndpoint.getByProjectId(projectId);
  }

  setCostEstimate(projectId: number, estimate: CostEstimate, currency: string): Observable<CostEstimate> {
    return this.costEstimatesEndpoint.set(projectId, estimate, currency);
  }
}
