import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Period } from '../../shared/domain/model/period';
import { Employee } from '../domain/model/employee.entity';
import {
  CreateFixedCostCommand,
  RegisterFixedCostPaymentCommand,
  UpdateFixedCostCommand,
} from '../domain/model/fixed-cost.commands';
import { FixedCost } from '../domain/model/fixed-cost.entity';
import { FixedCostPayment } from '../domain/model/fixed-cost-payment.entity';
import { HireEmployeeCommand, UpdateEmployeeCommand } from '../domain/model/hire-employee.command';
import { paidFor, pendingFor, sumAmounts } from '../domain/services/fixed-cost-figures';
import { StaffApi } from '../infrastructure/staff-api';

/** Staff context state: employees, fixed costs and the payments of the month being shown. */
@Injectable({ providedIn: 'root' })
export class StaffStore {
  private readonly staffApi = inject(StaffApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly employeesSignal = signal<Employee[]>([]);
  private readonly fixedCostsSignal = signal<FixedCost[]>([]);
  private readonly paymentsSignal = signal<FixedCostPayment[]>([]);
  /** Month whose payments are loaded; a payment for another month is not added to the list. */
  private paymentsPeriod: Period | null = null;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly employees = this.employeesSignal.asReadonly();
  readonly activeEmployees = computed(() => this.employeesSignal().filter((employee) => employee.isActive()));
  readonly fixedCosts = this.fixedCostsSignal.asReadonly();
  readonly activeFixedCosts = computed(() => this.fixedCostsSignal().filter((cost) => cost.isActive()));
  /** Payments of the loaded month. */
  readonly payments = this.paymentsSignal.asReadonly();
  /** What the company commits to every month: sum of the active fixed costs. */
  readonly monthlyFixedCostTotal = computed(() => sumAmounts(this.activeFixedCosts().map((c) => c.monthlyAmount)));
  /** Everything paid in the loaded month (a cost deactivated afterwards still counts: the money left). */
  readonly paidInPeriod = computed(() => sumAmounts(this.paymentsSignal().map((p) => p.amount)));
  /** Still owed in the loaded month by the active costs. */
  readonly pendingInPeriod = computed(() =>
    sumAmounts(this.activeFixedCosts().map((cost) => pendingFor(cost, this.paymentsSignal()))),
  );
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
    this.run(this.staffApi.getEmployeeById(id), 'Failed to load employee', (employee) =>
      this.employeesSignal.update((list) => upsert(list, employee)),
    );
  }

  hireEmployee(command: HireEmployeeCommand, navigateTo: string[]): void {
    this.run(this.staffApi.hireEmployee(command), 'Failed to hire employee', (employee) => {
      this.employeesSignal.update((list) => upsert(list, employee));
      void this.router.navigate(navigateTo);
    });
  }

  /** Changes position and salary; name, DNI and hiring date never change. */
  updateEmployee(id: number, command: UpdateEmployeeCommand, navigateTo: string[]): void {
    this.run(this.staffApi.updateEmployee(id, command), 'Failed to update employee', (employee) => {
      this.employeesSignal.update((list) => upsert(list, employee));
      void this.router.navigate(navigateTo);
    });
  }

  terminateEmployee(id: number, terminatedOn: string): void {
    this.run(this.staffApi.terminateEmployee(id, terminatedOn), 'Failed to terminate employee', (employee) =>
      this.employeesSignal.update((list) => upsert(list, employee)),
    );
  }

  getEmployeeById(id: number | null): Employee | undefined {
    return id === null ? undefined : this.employeesSignal().find((employee) => employee.id === id);
  }

  loadFixedCosts(): void {
    this.run(this.staffApi.getFixedCosts(), 'Failed to load fixed costs', (costs) =>
      this.fixedCostsSignal.set([...costs].sort((a, b) => a.code.localeCompare(b.code))),
    );
  }

  /** Loads one fixed cost fresh from the API (the edit form may be opened directly by URL). */
  loadFixedCost(id: number): void {
    this.run(this.staffApi.getFixedCostById(id), 'Failed to load fixed cost', (cost) =>
      this.fixedCostsSignal.update((list) => upsert(list, cost)),
    );
  }

  /** Loads the payments of a month (the backend requires year and month). */
  loadPayments(period: Period): void {
    this.paymentsPeriod = period;
    this.paymentsSignal.set([]);
    this.run(this.staffApi.getPaymentsByPeriod(period.year, period.month), 'Failed to load payments', (payments) => {
      // Ignore a late answer for a month the user already left.
      if (this.paymentsPeriod === period) {
        this.paymentsSignal.set(payments);
      }
    });
  }

  createFixedCost(command: CreateFixedCostCommand, navigateTo: string[]): void {
    this.run(this.staffApi.createFixedCost(command), 'Failed to create fixed cost', (cost) => {
      this.fixedCostsSignal.update((list) => upsert(list, cost).sort((a, b) => a.code.localeCompare(b.code)));
      void this.router.navigate(navigateTo);
    });
  }

  /** Changes concept, amount and weeks; code, type and employee never change. */
  updateFixedCost(id: number, command: UpdateFixedCostCommand, navigateTo: string[]): void {
    this.run(this.staffApi.updateFixedCost(id, command), 'Failed to update fixed cost', (cost) => {
      this.fixedCostsSignal.update((list) => upsert(list, cost));
      void this.router.navigate(navigateTo);
    });
  }

  /** Deactivating cannot be undone: the cost stops counting and cannot be paid or edited. */
  deactivateFixedCost(id: number): void {
    this.run(this.staffApi.deactivateFixedCost(id), 'Failed to deactivate fixed cost', (cost) =>
      this.fixedCostsSignal.update((list) => upsert(list, cost)),
    );
  }

  registerPayment(fixedCostId: number, command: RegisterFixedCostPaymentCommand): void {
    this.run(this.staffApi.registerPayment(fixedCostId, command), 'Failed to register payment', (payment) => {
      const period = this.paymentsPeriod;
      if (period && period.year === payment.year && period.month === payment.month) {
        this.paymentsSignal.update((payments) => [...payments, payment]);
      }
    });
  }

  getFixedCostById(id: number | null): FixedCost | undefined {
    return id === null ? undefined : this.fixedCostsSignal().find((cost) => cost.id === id);
  }

  /** Paid for a cost in the loaded month. */
  paidAmount(fixedCostId: number): number {
    return paidFor(fixedCostId, this.paymentsSignal());
  }

  /** Still owed by a cost in the loaded month (0 if it is inactive). */
  pendingAmount(fixedCostId: number): number {
    const cost = this.getFixedCostById(fixedCostId);
    return cost && cost.isActive() ? pendingFor(cost, this.paymentsSignal()) : 0;
  }

  clearError(): void {
    this.errorSignal.set(null);
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

/** Replaces the item with the same id, or appends it. */
function upsert<T extends { id: number }>(list: readonly T[], item: T): T[] {
  return list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item];
}
