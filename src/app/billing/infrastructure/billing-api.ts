import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Invoice } from '../domain/model/invoice.entity';
import { InvoicePayment } from '../domain/model/invoice-payment.entity';
import { IssueInvoiceCommand } from '../domain/model/issue-invoice.command';
import { InvoicePaymentsApiEndpoint } from './invoice-payments-api-endpoint';
import { InvoicesApiEndpoint } from './invoices-api-endpoint';

/**
 * Billing context facade (invoices for now; issue, payments and scheduled collections follow).
 */
@Injectable({ providedIn: 'root' })
export class BillingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly invoicesEndpoint = new InvoicesApiEndpoint(this.http);
  private readonly invoicePaymentsEndpoint = new InvoicePaymentsApiEndpoint(this.http);

  getInvoices(): Observable<Invoice[]> {
    return this.invoicesEndpoint.getAll();
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.invoicesEndpoint.getById(id);
  }

  issueInvoice(command: IssueInvoiceCommand): Observable<Invoice> {
    return this.invoicesEndpoint.issue(command);
  }

  voidInvoice(id: number): Observable<Invoice> {
    return this.invoicesEndpoint.voidInvoice(id);
  }

  getPayments(invoiceId: number): Observable<InvoicePayment[]> {
    return this.invoicePaymentsEndpoint.getByInvoiceId(invoiceId);
  }

  registerPayment(invoiceId: number, payment: InvoicePayment, currency: string): Observable<InvoicePayment> {
    return this.invoicePaymentsEndpoint.register(invoiceId, payment, currency);
  }
}
