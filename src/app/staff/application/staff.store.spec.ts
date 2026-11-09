import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { StaffApi } from '../infrastructure/staff-api';
import { employeeFixture } from '../testing/employee-fixtures';
import { StaffStore } from './staff.store';

describe('StaffStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let role: Role;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: StaffApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: (...roles: Role[]) => roles.includes(role) } },
        { provide: Router, useValue: router },
      ],
    });
    return TestBed.inject(StaffStore);
  };

  beforeEach(() => {
    role = Role.ROLE_ACCOUNTING;
    router = { navigate: vi.fn() };
    api = {
      getEmployees: vi.fn().mockReturnValue(
        of([
          employeeFixture({ id: 1 }),
          employeeFixture({ id: 5, fullName: 'Pedro Ramos Ccori', active: false, terminatedOn: '2026-09-30' }),
        ]),
      ),
      hireEmployee: vi.fn(),
      updateEmployee: vi.fn(),
      terminateEmployee: vi.fn(),
    };
  });

  it('keeps terminated employees listed but out of the active ones', () => {
    const store = createStore();
    store.loadEmployees();
    expect(store.employees()).toHaveLength(2);
    expect(store.activeEmployees().map((e) => e.id)).toEqual([1]);
  });

  it('adds the hired employee and navigates', () => {
    api['hireEmployee'].mockReturnValue(of(employeeFixture({ id: 6, fullName: 'Andrea Salazar Ponce' })));
    const store = createStore();
    store.hireEmployee(
      { fullName: 'Andrea Salazar Ponce', dni: '46789016', position: '', monthlySalary: 3000, currency: 'PEN', hiredOn: '2026-11-02' },
      ['/staff/employees'],
    );
    expect(store.getEmployeeById(6)?.fullName).toBe('Andrea Salazar Ponce');
    expect(router.navigate).toHaveBeenCalledWith(['/staff/employees']);
  });

  it('replaces the employee with the terminated one the API returns', () => {
    api['terminateEmployee'].mockReturnValue(of(employeeFixture({ id: 1, active: false, terminatedOn: '2026-11-09' })));
    const store = createStore();
    store.loadEmployees();
    store.terminateEmployee(1, '2026-11-09');
    expect(api['terminateEmployee']).toHaveBeenCalledWith(1, '2026-11-09');
    expect(store.getEmployeeById(1)?.terminatedOn).toBe('2026-11-09');
    expect(store.activeEmployees()).toHaveLength(0);
  });

  it('exposes the API error and does not navigate when updating fails', () => {
    api['updateEmployee'].mockReturnValue(throwError(() => new Error('El empleado ya está dado de baja.')));
    const store = createStore();
    store.updateEmployee(5, { position: 'Técnico', monthlySalary: 3500, currency: 'PEN' }, ['/staff/employees']);
    expect(store.error()).toBe('El empleado ya está dado de baja.');
    expect(store.loading()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lets admin and accounting write but not management or engineers', () => {
    expect(createStore().canWrite()).toBe(true);
    for (const reader of [Role.ROLE_MANAGEMENT, Role.ROLE_ENGINEER]) {
      TestBed.resetTestingModule();
      role = reader;
      expect(createStore().canWrite()).toBe(false);
    }
  });
});
