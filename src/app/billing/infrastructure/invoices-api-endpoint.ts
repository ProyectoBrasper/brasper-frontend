import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Invoice } from '../domain/model/invoice.entity';
import { InvoiceAssembler } from './invoice-assembler';
import { InvoiceResource, InvoicesResponse } from './invoice.resource';

/**
 * Client for `/invoices` (list with `?status=&projectId=&year=&month=`, get). Issue, void and
 * payments are added with their screens.
 */
export class InvoicesApiEndpoint extends BaseApiEndpoint<Invoice, InvoiceResource, InvoicesResponse, InvoiceAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderInvoicesEndpointPath}`,
      new InvoiceAssembler(),
    );
  }

  getByProjectId(projectId: number): Observable<Invoice[]> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<InvoiceResource[] | InvoicesResponse>(this.endpointUrl, { params }).pipe(
      map((response) => this.toEntities(response)),
      catchError(this.handleError('Failed to fetch invoices')),
    );
  }
}
