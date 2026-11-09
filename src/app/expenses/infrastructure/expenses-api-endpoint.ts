import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Expense } from '../domain/model/expense.entity';
import { ExpenseAssembler } from './expense-assembler';
import { ExpenseResource, ExpensesResponse } from './expense.resource';

/**
 * Client for `/expenses`. The list accepts `?projectId=&year=&month=&category=` (year and month go
 * together) and includes annulled expenses. `POST /{id}/annul` replaces deleting. Registering and
 * correcting come with the expense form.
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

  /** `POST /expenses/{id}/annul`: keeps the expense for audit, flagged as annulled. */
  annul(id: number): Observable<Expense> {
    return this.http.post<ExpenseResource>(`${this.endpointUrl}/${id}/annul`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to annul expense')),
    );
  }
}
