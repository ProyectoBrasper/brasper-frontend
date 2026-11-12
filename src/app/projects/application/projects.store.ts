import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Client } from '../domain/model/client.entity';
import { Project } from '../domain/model/project.entity';
import { ProjectStatus } from '../domain/model/project-status';
import { COST_CATEGORIES } from '../domain/model/cost-category';
import { CostEstimate } from '../domain/model/cost-estimate.entity';
import { ProgressRecord } from '../domain/model/progress-record.entity';
import { ProjectsApi } from '../infrastructure/projects-api';

const sortByPeriod = (records: ProgressRecord[]) => [...records].sort((a, b) => a.periodKey - b.periodKey);
const sortByCategory = (estimates: CostEstimate[]) =>
  [...estimates].sort((a, b) => COST_CATEGORIES.indexOf(a.category) - COST_CATEGORIES.indexOf(b.category));

/**
 * Projects context state: clients, projects and the progress / cost estimates of the open project.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly projectsApi = inject(ProjectsApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly clientsSignal = signal<Client[]>([]);
  private readonly projectsSignal = signal<Project[]>([]);
  private readonly progressRecordsSignal = signal<ProgressRecord[]>([]);
  private readonly costEstimatesSignal = signal<CostEstimate[]>([]);
  /** Requests in flight; several can run at once (e.g. clients and projects). */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly clients = this.clientsSignal.asReadonly();
  readonly projects = this.projectsSignal.asReadonly();
  readonly inProgressProjects = computed(() => this.projectsSignal().filter((p) => p.isInProgress()));
  /** Progress of the project opened in the detail, in chronological order. */
  readonly progressRecords = this.progressRecordsSignal.asReadonly();
  /** Cost estimates of the project opened in the detail, in category order. */
  readonly costEstimates = this.costEstimatesSignal.asReadonly();
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Management only reads; admin, accounting and engineering can create and edit. */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.operationsWrite));

  loadClients(): void {
    this.run(this.projectsApi.getClients(), 'Failed to load clients', (clients) => this.clientsSignal.set(clients));
  }

  /** Creates a client and navigates to `navigateTo` when the API accepts it. */
  createClient(client: Client, navigateTo: string[]): void {
    this.run(this.projectsApi.createClient(client), 'Failed to create client', (created) => {
      this.clientsSignal.update((clients) => [...clients, created]);
      void this.router.navigate(navigateTo);
    });
  }

  /** Updates a client and navigates to `navigateTo` when the API accepts it. */
  updateClient(client: Client, navigateTo: string[]): void {
    this.run(this.projectsApi.updateClient(client), 'Failed to update client', (updated) => {
      this.clientsSignal.update((clients) => clients.map((c) => (c.id === updated.id ? updated : c)));
      void this.router.navigate(navigateTo);
    });
  }

  getClientById(id: number): Client | undefined {
    return this.clientsSignal().find((client) => client.id === id);
  }

  loadProjects(): void {
    this.run(this.projectsApi.getProjects(), 'Failed to load projects', (projects) =>
      this.projectsSignal.set(projects),
    );
  }

  /** Creates a project (always quoted) and navigates to `navigateTo` when the API accepts it. */
  createProject(project: Project, navigateTo: string[]): void {
    this.run(this.projectsApi.createProject(project), 'Failed to create project', (created) => {
      this.projectsSignal.update((projects) => [...projects, created]);
      void this.router.navigate(navigateTo);
    });
  }

  /** Updates an open project and navigates to `navigateTo` when the API accepts it. */
  updateProject(project: Project, navigateTo: string[]): void {
    this.run(this.projectsApi.updateProject(project), 'Failed to update project', (updated) => {
      this.replaceProject(updated);
      void this.router.navigate(navigateTo);
    });
  }

  /** Quoted → in progress. */
  startProject(id: number): void {
    this.run(this.projectsApi.startProject(id), 'Failed to start project', (project) =>
      this.replaceProject(project),
    );
  }

  /** Quoted or in progress → cancelled. */
  cancelProject(id: number): void {
    this.run(this.projectsApi.cancelProject(id), 'Failed to cancel project', (project) =>
      this.replaceProject(project),
    );
  }

  /** Loads one project with its progress and cost estimates (and the clients, for the client card). */
  loadProjectDetail(projectId: number): void {
    this.progressRecordsSignal.set([]);
    this.costEstimatesSignal.set([]);
    this.refreshProject(projectId);
    this.run(this.projectsApi.getProgressRecords(projectId), 'Failed to load progress', (records) =>
      this.progressRecordsSignal.set(sortByPeriod(records)),
    );
    this.run(this.projectsApi.getCostEstimates(projectId), 'Failed to load cost estimates', (estimates) =>
      this.costEstimatesSignal.set(sortByCategory(estimates)),
    );
    if (this.clientsSignal().length === 0) {
      this.loadClients();
    }
  }

  /** Registers a month of progress; the backend recalculates the accumulated progress and may complete the project. */
  registerProgress(projectId: number, record: ProgressRecord): void {
    this.run(this.projectsApi.registerProgress(projectId, record), 'Failed to register progress', (created) => {
      this.progressRecordsSignal.update((records) => sortByPeriod([...records, created]));
      this.refreshProject(projectId);
    });
  }

  /** Creates or replaces the estimate of a category; the backend recalculates the estimated direct cost. */
  setCostEstimate(projectId: number, estimate: CostEstimate): void {
    const currency = this.getProjectById(projectId)?.currency ?? 'PEN';
    this.run(this.projectsApi.setCostEstimate(projectId, estimate, currency), 'Failed to set cost estimate', (saved) => {
      this.costEstimatesSignal.update((estimates) =>
        sortByCategory([...estimates.filter((e) => e.category !== saved.category), saved]),
      );
      this.refreshProject(projectId);
    });
  }

  getProjectById(id: number): Project | undefined {
    return this.projectsSignal().find((project) => project.id === id);
  }

  /** How many projects there are per status (for the list filter chips). */
  countByStatus(status: ProjectStatus | null): number {
    const projects = this.projectsSignal();
    return status === null ? projects.length : projects.filter((p) => p.status === status).length;
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private replaceProject(project: Project): void {
    this.projectsSignal.update((projects) => projects.map((p) => (p.id === project.id ? project : p)));
  }

  /** Re-reads a project from the API and puts it in the list (adds it if it was not loaded). */
  private refreshProject(projectId: number): void {
    this.run(this.projectsApi.getProjectById(projectId), 'Failed to load project', (project) =>
      this.projectsSignal.update((projects) =>
        projects.some((p) => p.id === project.id)
          ? projects.map((p) => (p.id === project.id ? project : p))
          : [...projects, project],
      ),
    );
  }

  private run<T>(request: Observable<T>, fallback: string, onSuccess: (value: T) => void): void {
    this.pendingSignal.update((pending) => pending + 1);
    this.errorSignal.set(null);
    request.subscribe({
      next: (value) => {
        onSuccess(value);
        this.pendingSignal.update((pending) => pending - 1);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : fallback);
        this.pendingSignal.update((pending) => pending - 1);
      },
    });
  }
}
