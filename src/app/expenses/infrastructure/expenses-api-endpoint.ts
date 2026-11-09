import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Expense } from '../domain/model/expense.entity';
import { ExpenseAssembler } from './expense-assembler';
import {
  CorrectExpenseRequest,
  ExpenseResource,
  ExpensesResponse,
  RegisterExpenseRequest,
} from './expense.resource';
import { CorrectExpenseCommand, RegisterExpenseCommand } from '../domain/model/register-expense.command';

/**
 * Client for `/expenses`. The list accepts `?projectId=&year=&month=&category=` (year and month go
 * together) and includes annulled expenses. `POST` registers, `PUT /{id}` corrects and
 * `POST /{id}/annul` replaces deleting.
 */
export class ExpensesApiEndpoint extends BaseApiEndpoint<
  Expense,
  ExpenseResource,
  ExpensesResponse,
  ExpenseAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderExpensesEndpointPath}`,
      new ExpenseAssembler(),
    );
  }

  /** `POST /expenses`: the backend calculates the amounts (IGV only for an invoice). */
  register(command: RegisterExpenseCommand): Observable<Expense> {
    const request: RegisterExpenseRequest = {
      spentOn: command.spentOn,
      projectId: command.projectId,
      supplierId: command.supplierId,
      category: command.category,
      description: command.description.trim() || null,
      voucherType: command.voucherType,
      voucherNumber: command.voucherNumber.trim() || null,
      amount: command.amount,
      amountIncludesIgv: command.amountIncludesIgv,
      currency: command.currency,
      paymentMethod: command.paymentMethod,
      bankAccountId: command.bankAccountId,
      partnerId: command.partnerId,
      paid: command.paid,
    };
    return this.http.post<ExpenseResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register expense')),
    );
  }

  /** `PUT /expenses/{id}`: only the category, the project and the description can change. */
  correct(id: number, command: CorrectExpenseCommand): Observable<Expense> {
    const request: CorrectExpenseRequest = {
      projectId: command.projectId,
      category: command.category,
      description: command.description.trim() || null,
    };
    return this.http.put<ExpenseResource>(`${this.endpointUrl}/${id}`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to correct expense')),
    );
  }

  /** `POST /expenses/{id}/annul`: keeps the expense for audit, flagged as annulled. */
  annul(id: number): Observable<Expense> {
    return this.http.post<ExpenseResource>(`${this.endpointUrl}/${id}/annul`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to annul expense')),
    );
  }
}
