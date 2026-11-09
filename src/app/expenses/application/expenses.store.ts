import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Expense } from '../domain/model/expense.entity';
import { Supplier } from '../domain/model/supplier.entity';
import { ExpensesApi } from '../infrastructure/expenses-api';

/** Expenses context state: expenses and suppliers (register, correct and supplier edits follow). */
@Injectable({ providedIn: 'root' })
export class ExpensesStore {
  private readonly expensesApi = inject(ExpensesApi);
  private readonly iamStore = inject(IamStore);

  private readonly expensesSignal = signal<Expense[]>([]);
  private readonly suppliersSignal = signal<Supplier[]>([]);
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly expenses = this.expensesSignal.asReadonly();
  readonly suppliers = this.suppliersSignal.asReadonly();
  /** Expenses that still count: annulled ones stay listed but are left out of every total. */
  readonly activeExpenses = computed(() => this.expensesSignal().filter((expense) => expense.isActive()));
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Management only reads; admin, accounting and engineers write (backend rule). */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.operationsWrite));

  loadExpenses(): void {
    this.run(this.expensesApi.getExpenses(), 'Failed to load expenses', (expenses) =>
      this.expensesSignal.set(expenses),
    );
  }

  loadSuppliers(): void {
    this.run(this.expensesApi.getSuppliers(), 'Failed to load suppliers', (suppliers) =>
      this.suppliersSignal.set(suppliers),
    );
  }

  /** Annuls an expense (it is never deleted); the backend answers with the annulled expense. */
  annulExpense(id: number): void {
    this.run(this.expensesApi.annulExpense(id), 'Failed to annul expense', (annulled) =>
      this.expensesSignal.update((expenses) => expenses.map((e) => (e.id === annulled.id ? annulled : e))),
    );
  }

  getExpenseById(id: number): Expense | undefined {
    return this.expensesSignal().find((expense) => expense.id === id);
  }

  getSupplierById(id: number | null): Supplier | undefined {
    return id === null ? undefined : this.suppliersSignal().find((supplier) => supplier.id === id);
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
