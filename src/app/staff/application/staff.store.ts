import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Employee } from '../domain/model/employee.entity';
import { HireEmployeeCommand, UpdateEmployeeCommand } from '../domain/model/hire-employee.command';
import { StaffApi } from '../infrastructure/staff-api';

/** Staff context state (employees for now; fixed costs and their payments follow). */
@Injectable({ providedIn: 'root' })
export class StaffStore {
  private readonly staffApi = inject(StaffApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly employeesSignal = signal<Employee[]>([]);
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly employees = this.employeesSignal.asReadonly();
  readonly activeEmployees = computed(() => this.employeesSignal().filter((employee) => employee.isActive()));
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Admin and accounting write; management only reads (backend rule). */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.staffWrite));

  loadEmployees(): void {
    this.run(this.staffApi.getEmployees(), 'Failed to load employees', (employees) =>
      this.employeesSignal.set(employees),
    );
  }

  /** Loads one employee fresh from the API (the edit form may be opened directly by URL). */
  loadEmployee(id: number): void {
    this.run(this.staffApi.getEmployeeById(id), 'Failed to load employee', (employee) => this.upsert(employee));
  }

  hireEmployee(command: HireEmployeeCommand, navigateTo: string[]): void {
    this.run(this.staffApi.hireEmployee(command), 'Failed to hire employee', (employee) => {
      this.upsert(employee);
      void this.router.navigate(navigateTo);
    });
  }

  /** Changes position and salary; name, DNI and hiring date never change. */
  updateEmployee(id: number, command: UpdateEmployeeCommand, navigateTo: string[]): void {
    this.run(this.staffApi.updateEmployee(id, command), 'Failed to update employee', (employee) => {
      this.upsert(employee);
      void this.router.navigate(navigateTo);
    });
  }

  terminateEmployee(id: number, terminatedOn: string): void {
    this.run(this.staffApi.terminateEmployee(id, terminatedOn), 'Failed to terminate employee', (employee) =>
      this.upsert(employee),
    );
  }

  getEmployeeById(id: number | null): Employee | undefined {
    return id === null ? undefined : this.employeesSignal().find((employee) => employee.id === id);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private upsert(employee: Employee): void {
    this.employeesSignal.update((employees) =>
      employees.some((e) => e.id === employee.id)
        ? employees.map((e) => (e.id === employee.id ? employee : e))
        : [...employees, employee],
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
