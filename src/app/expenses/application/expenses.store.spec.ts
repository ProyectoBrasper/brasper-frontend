import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { ExpensesApi } from '../infrastructure/expenses-api';
import { expenseFixture } from '../testing/expense-fixtures';
import { ExpensesStore } from './expenses.store';

describe('ExpensesStore', () => {
  let api: { getExpenses: ReturnType<typeof vi.fn>; annulExpense: ReturnType<typeof vi.fn> };
  let role: Role;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ExpensesApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: (...roles: Role[]) => roles.includes(role) } },
      ],
    });
    return TestBed.inject(ExpensesStore);
  };

  beforeEach(() => {
    role = Role.ROLE_ENGINEER;
    api = {
      getExpenses: vi.fn().mockReturnValue(of([expenseFixture({ id: 1 }), expenseFixture({ id: 7, annulled: true })])),
      annulExpense: vi.fn(),
    };
  });

  it('keeps annulled expenses listed but out of the active ones', () => {
    const store = createStore();
    store.loadExpenses();
    expect(store.expenses()).toHaveLength(2);
    expect(store.activeExpenses().map((e) => e.id)).toEqual([1]);
  });

  it('replaces the expense with the annulled one the API returns', () => {
    api.annulExpense.mockReturnValue(of(expenseFixture({ id: 1, annulled: true })));
    const store = createStore();
    store.loadExpenses();
    store.annulExpense(1);
    expect(api.annulExpense).toHaveBeenCalledWith(1);
    expect(store.getExpenseById(1)?.annulled).toBe(true);
    expect(store.activeExpenses()).toHaveLength(0);
  });

  it('exposes the API error when annulling fails', () => {
    api.annulExpense.mockReturnValue(throwError(() => new Error('El gasto está anulado y no se puede modificar.')));
    const store = createStore();
    store.loadExpenses();
    store.annulExpense(7);
    expect(store.error()).toBe('El gasto está anulado y no se puede modificar.');
    expect(store.loading()).toBe(false);
  });

  it('lets engineers write but not management', () => {
    expect(createStore().canWrite()).toBe(true);
    TestBed.resetTestingModule();
    role = Role.ROLE_MANAGEMENT;
    expect(createStore().canWrite()).toBe(false);
  });
});
