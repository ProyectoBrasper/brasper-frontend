import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { Client } from '../domain/model/client.entity';
import { CostCategory } from '../domain/model/cost-category';
import { CostEstimate } from '../domain/model/cost-estimate.entity';
import { ProgressRecord } from '../domain/model/progress-record.entity';
import { Project } from '../domain/model/project.entity';
import { ProjectStatus } from '../domain/model/project-status';
import { ProjectsApi } from '../infrastructure/projects-api';
import { ProjectsStore } from './projects.store';

const client = (id: number, businessName: string) =>
  new Client({ id, businessName, ruc: `2060123456${id}`, contactName: '', phone: '', email: '' });

describe('ProjectsStore (clients)', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let role: Role;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectsApi, useValue: api },
        { provide: Router, useValue: router },
        { provide: IamStore, useValue: { hasAnyRole: (...roles: Role[]) => roles.includes(role) } },
      ],
    });
    return TestBed.inject(ProjectsStore);
  };

  beforeEach(() => {
    role = Role.ROLE_ADMIN;
    api = {
      getClients: vi.fn().mockReturnValue(of([client(1, 'Pampa Dorada')])),
      createClient: vi.fn(),
      updateClient: vi.fn(),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };
  });

  it('loads clients', () => {
    const store = createStore();
    store.loadClients();
    expect(store.clients().map((c) => c.businessName)).toEqual(['Pampa Dorada']);
    expect(store.loading()).toBe(false);
  });

  it('adds a created client and navigates', () => {
    api['createClient'].mockReturnValue(of(client(2, 'Río Chillón')));
    const store = createStore();
    store.loadClients();
    store.createClient(client(0, 'Río Chillón'), ['/projects/clients']);
    expect(store.clients()).toHaveLength(2);
    expect(router.navigate).toHaveBeenCalledWith(['/projects/clients']);
  });

  it('keeps the user on the form when the API rejects the client', () => {
    api['createClient'].mockReturnValue(throwError(() => new Error('Ya existe un cliente con ese RUC.')));
    const store = createStore();
    store.createClient(client(0, 'Duplicado'), ['/projects/clients']);
    expect(store.error()).toBe('Ya existe un cliente con ese RUC.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('replaces an updated client', () => {
    api['updateClient'].mockReturnValue(of(client(1, 'Pampa Dorada S.A.C.')));
    const store = createStore();
    store.loadClients();
    store.updateClient(client(1, 'Pampa Dorada S.A.C.'), ['/projects/clients']);
    expect(store.getClientById(1)?.businessName).toBe('Pampa Dorada S.A.C.');
  });

  it('replaces a project after starting it and counts by status', () => {
    const quoted = new Project({
      id: 3, code: '003BR-MAR-2026', name: 'Climatización', description: '', clientId: 3, budget: 275000,
      currency: 'PEN', quotedOn: '2026-03-18', status: ProjectStatus.QUOTED, participation: 1,
      salesCommissionRate: 0, accumulatedProgress: 0, estimatedDirectCost: 171000,
    });
    const started = new Project({
      id: 3, code: '003BR-MAR-2026', name: 'Climatización', description: '', clientId: 3, budget: 275000,
      currency: 'PEN', quotedOn: '2026-03-18', status: ProjectStatus.IN_PROGRESS, participation: 1,
      salesCommissionRate: 0, accumulatedProgress: 0, estimatedDirectCost: 171000,
    });
    api['getProjects'] = vi.fn().mockReturnValue(of([quoted]));
    api['startProject'] = vi.fn().mockReturnValue(of(started));
    const store = createStore();
    store.loadProjects();
    expect(store.countByStatus(ProjectStatus.QUOTED)).toBe(1);

    store.startProject(3);

    expect(store.getProjectById(3)?.status).toBe(ProjectStatus.IN_PROGRESS);
    expect(store.inProgressProjects()).toHaveLength(1);
    expect(store.countByStatus(null)).toBe(1);
  });

  it('shows the backend error when a transition is not allowed', () => {
    api['cancelProject'] = vi.fn().mockReturnValue(
      throwError(() => new Error('El estado del proyecto no permite esta operación.')),
    );
    const store = createStore();
    store.cancelProject(5);
    expect(store.error()).toBe('El estado del proyecto no permite esta operación.');
    expect(store.loading()).toBe(false);
  });

  it('registers progress in order and refreshes the project from the API', () => {
    const base = {
      id: 1, code: '001BR-ENE-2026', name: 'Ampliación', description: '', clientId: 1, budget: 850000,
      currency: 'PEN', quotedOn: '2026-01-14', participation: 0.6, salesCommissionRate: 0.02, estimatedDirectCost: 480000,
    };
    const before = new Project({ ...base, status: ProjectStatus.IN_PROGRESS, accumulatedProgress: 0.72 });
    const after = new Project({ ...base, status: ProjectStatus.COMPLETED, accumulatedProgress: 1 });
    const october = new ProgressRecord({ id: 8, projectId: 1, year: 2026, month: 10, percentage: 0.03 });
    const march = new ProgressRecord({ id: 1, projectId: 1, year: 2026, month: 3, percentage: 0.08 });
    const november = new ProgressRecord({ id: 9, projectId: 1, year: 2026, month: 11, percentage: 0.28 });
    api['getProjectById'] = vi.fn().mockReturnValueOnce(of(before)).mockReturnValueOnce(of(after));
    api['getProgressRecords'] = vi.fn().mockReturnValue(of([october, march]));
    api['getCostEstimates'] = vi.fn().mockReturnValue(of([]));
    api['registerProgress'] = vi.fn().mockReturnValue(of(november));
    const store = createStore();

    store.loadProjectDetail(1);
    expect(store.progressRecords().map((r) => r.month)).toEqual([3, 10]);

    store.registerProgress(1, november);
    expect(store.progressRecords().map((r) => r.month)).toEqual([3, 10, 11]);
    expect(store.getProjectById(1)?.status).toBe(ProjectStatus.COMPLETED);
  });

  it('replaces the estimate of the same category and sends the project currency', () => {
    const project = new Project({
      id: 2, code: '002BR-FEB-2026', name: 'Torre Norte', description: '', clientId: 2, budget: 420500,
      currency: 'PEN', quotedOn: '2026-02-09', status: ProjectStatus.IN_PROGRESS, participation: 0.45,
      salesCommissionRate: 0.025, accumulatedProgress: 0.68, estimatedDirectCost: 250000,
    });
    const other = (amount: number) =>
      new CostEstimate({ id: 8, projectId: 2, category: CostCategory.OTHER, estimatedAmount: amount });
    const materials = new CostEstimate({ id: 5, projectId: 2, category: CostCategory.MATERIALS, estimatedAmount: 150000 });
    api['getProjectById'] = vi.fn().mockReturnValue(of(project));
    api['getProgressRecords'] = vi.fn().mockReturnValue(of([]));
    api['getCostEstimates'] = vi.fn().mockReturnValue(of([other(12000), materials]));
    api['setCostEstimate'] = vi.fn().mockReturnValue(of(other(40000)));
    const store = createStore();
    store.loadProjectDetail(2);

    store.setCostEstimate(2, other(40000));

    expect(api['setCostEstimate']).toHaveBeenCalledWith(2, other(40000), 'PEN');
    expect(store.costEstimates().map((e) => [e.category, e.estimatedAmount])).toEqual([
      [CostCategory.MATERIALS, 150000],
      [CostCategory.OTHER, 40000],
    ]);
  });

  it('lets management only read', () => {
    role = Role.ROLE_MANAGEMENT;
    expect(createStore().canWrite()).toBe(false);
  });
});
