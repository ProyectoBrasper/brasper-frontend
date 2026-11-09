import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Invoice } from '../domain/model/invoice.entity';
import { InvoicePayment } from '../domain/model/invoice-payment.entity';
import { IssueInvoiceCommand } from '../domain/model/issue-invoice.command';
import { InvoicePaymentsApiEndpoint } from './invoice-payments-api-endpoint';
import { ScheduledCollection } from '../domain/model/scheduled-collection.entity';
import { ScheduleCollectionRequest, ScheduledCollectionsApiEndpoint } from './scheduled-collections-api-endpoint';
import { InvoicesApiEndpoint } from './invoices-api-endpoint';

/**
 * Billing context facade (invoices for now; issue, payments and scheduled collections follow).
 */
@Injectable({ providedIn: 'root' })
export class BillingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly invoicesEndpoint = new InvoicesApiEndpoint(this.http);
  private readonly invoicePaymentsEndpoint = new InvoicePaymentsApiEndpoint(this.http);
  private readonly scheduledCollectionsEndpoint = new ScheduledCollectionsApiEndpoint(this.http);

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

  getScheduledCollections(year: number, month: number): Observable<ScheduledCollection[]> {
    return this.scheduledCollectionsEndpoint.getByPeriod(year, month);
  }

  scheduleCollection(request: ScheduleCollectionRequest): Observable<ScheduledCollection> {
    return this.scheduledCollectionsEndpoint.schedule(request);
  }

  rescheduleCollection(id: number, expectedOn: string): Observable<ScheduledCollection> {
    return this.scheduledCollectionsEndpoint.reschedule(id, expectedOn);
  }

  cancelScheduledCollection(id: number): Observable<ScheduledCollection> {
    return this.scheduledCollectionsEndpoint.cancel(id);
  }
}
