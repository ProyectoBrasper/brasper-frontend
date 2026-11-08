import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Client } from '../domain/model/client.entity';
import { Project } from '../domain/model/project.entity';
import { ProjectStatus } from '../domain/model/project-status';
import { ProjectsApi } from '../infrastructure/projects-api';

/**
 * Projects context state: clients and projects (progress and cost estimates follow).
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly projectsApi = inject(ProjectsApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly clientsSignal = signal<Client[]>([]);
  private readonly projectsSignal = signal<Project[]>([]);
  /** Requests in flight; several can run at once (e.g. clients and projects). */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly clients = this.clientsSignal.asReadonly();
  readonly projects = this.projectsSignal.asReadonly();
  readonly inProgressProjects = computed(() => this.projectsSignal().filter((p) => p.isInProgress()));
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
