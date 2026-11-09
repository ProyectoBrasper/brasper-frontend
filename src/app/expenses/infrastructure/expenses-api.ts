import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Expense } from '../domain/model/expense.entity';
import { CorrectExpenseCommand, RegisterExpenseCommand } from '../domain/model/register-expense.command';
import { Supplier } from '../domain/model/supplier.entity';
import { ExpensesApiEndpoint } from './expenses-api-endpoint';
import { SuppliersApiEndpoint } from './suppliers-api-endpoint';

/** Expenses context facade: expenses (list, register, correct, annul) and suppliers. */
@Injectable({ providedIn: 'root' })
export class ExpensesApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly expensesEndpoint = new ExpensesApiEndpoint(this.http);
  private readonly suppliersEndpoint = new SuppliersApiEndpoint(this.http);

  getExpenses(): Observable<Expense[]> {
    return this.expensesEndpoint.getAll();
  }

  getExpenseById(id: number): Observable<Expense> {
    return this.expensesEndpoint.getById(id);
  }

  registerExpense(command: RegisterExpenseCommand): Observable<Expense> {
    return this.expensesEndpoint.register(command);
  }

  correctExpense(id: number, command: CorrectExpenseCommand): Observable<Expense> {
    return this.expensesEndpoint.correct(id, command);
  }

  annulExpense(id: number): Observable<Expense> {
    return this.expensesEndpoint.annul(id);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.suppliersEndpoint.getAll();
  }

  createSupplier(supplier: Supplier): Observable<Supplier> {
    return this.suppliersEndpoint.create(supplier);
  }

  updateSupplier(supplier: Supplier): Observable<Supplier> {
    return this.suppliersEndpoint.update(supplier, supplier.id);
  }
}
