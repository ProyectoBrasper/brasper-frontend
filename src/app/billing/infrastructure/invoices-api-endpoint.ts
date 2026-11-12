import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Invoice } from '../domain/model/invoice.entity';
import { IssueInvoiceCommand } from '../domain/model/issue-invoice.command';
import { InvoiceAssembler } from './invoice-assembler';
import { InvoiceResource, InvoicesResponse, IssueInvoiceRequest } from './invoice.resource';

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

  /** `POST /invoices`: the backend computes the amounts and takes the client from the project. */
  issue(command: IssueInvoiceCommand): Observable<Invoice> {
    const request: IssueInvoiceRequest = {
      series: command.series,
      correlative: command.correlative,
      issuedOn: command.issuedOn,
      purchaseOrder: command.purchaseOrder || null,
      projectId: command.projectId,
      taxableBase: command.taxableBase,
      currency: command.currency,
      hasRetention: command.hasRetention,
      hasDetraction: command.hasDetraction,
      selfDetraction: command.selfDetraction,
      advance: command.advance,
      notes: command.notes || null,
    };
    return this.http.post<InvoiceResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to issue invoice')),
    );
  }

  /** `POST /invoices/{id}/void`: only an invoice without payments. */
  voidInvoice(id: number): Observable<Invoice> {
    return this.http.post<InvoiceResource>(`${this.endpointUrl}/${id}/void`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to void invoice')),
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
