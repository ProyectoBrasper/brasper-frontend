import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Expense } from '../domain/model/expense.entity';
import { Supplier } from '../domain/model/supplier.entity';
import { ExpensesApiEndpoint } from './expenses-api-endpoint';
import { SuppliersApiEndpoint } from './suppliers-api-endpoint';

/** Expenses context facade (expense list for now; register, correct and suppliers follow). */
@Injectable({ providedIn: 'root' })
export class ExpensesApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly expensesEndpoint = new ExpensesApiEndpoint(this.http);
  private readonly suppliersEndpoint = new SuppliersApiEndpoint(this.http);

  getExpenses(): Observable<Expense[]> {
    return this.expensesEndpoint.getAll();
  }

  annulExpense(id: number): Observable<Expense> {
    return this.expensesEndpoint.annul(id);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.suppliersEndpoint.getAll();
  }
}
