import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { Client } from '../domain/model/client.entity';
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

  it('lets management only read', () => {
    role = Role.ROLE_MANAGEMENT;
    expect(createStore().canWrite()).toBe(false);
  });
});
