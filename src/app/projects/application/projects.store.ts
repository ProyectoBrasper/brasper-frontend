import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Client } from '../domain/model/client.entity';
import { ProjectsApi } from '../infrastructure/projects-api';

/**
 * Projects context state (clients for now; projects, progress and cost estimates follow).
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly projectsApi = inject(ProjectsApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly clientsSignal = signal<Client[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly clients = this.clientsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
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

  clearError(): void {
    this.errorSignal.set(null);
  }

  private run<T>(request: Observable<T>, fallback: string, onSuccess: (value: T) => void): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    request.subscribe({
      next: (value) => {
        onSuccess(value);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : fallback);
        this.loadingSignal.set(false);
      },
    });
  }
}
