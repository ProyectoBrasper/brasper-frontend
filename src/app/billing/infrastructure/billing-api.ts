import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Invoice } from '../domain/model/invoice.entity';
import { IssueInvoiceCommand } from '../domain/model/issue-invoice.command';
import { InvoicesApiEndpoint } from './invoices-api-endpoint';

/**
 * Billing context facade (invoices for now; issue, payments and scheduled collections follow).
 */
@Injectable({ providedIn: 'root' })
export class BillingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly invoicesEndpoint = new InvoicesApiEndpoint(this.http);

  getInvoices(): Observable<Invoice[]> {
    return this.invoicesEndpoint.getAll();
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.invoicesEndpoint.getById(id);
  }

  issueInvoice(command: IssueInvoiceCommand): Observable<Invoice> {
    return this.invoicesEndpoint.issue(command);
  }
}
