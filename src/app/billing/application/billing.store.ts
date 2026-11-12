import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Invoice } from '../domain/model/invoice.entity';
import { InvoiceStatus } from '../domain/model/invoice-status';
import { Period } from '../../shared/domain/model/period';
import { InvoicePayment } from '../domain/model/invoice-payment.entity';
import { ScheduledCollection } from '../domain/model/scheduled-collection.entity';
import { ScheduleCollectionRequest } from '../infrastructure/scheduled-collections-api-endpoint';
import { IssueInvoiceCommand } from '../domain/model/issue-invoice.command';
import { BillingApi } from '../infrastructure/billing-api';

const sortByWeek = (collections: ScheduledCollection[]) =>
  [...collections].sort((a, b) => a.week - b.week || a.id - b.id);
const sortByDate = (payments: InvoicePayment[]) =>
  [...payments].sort((a, b) => a.receivedOn.localeCompare(b.receivedOn) || a.id - b.id);

/**
 * Billing context state (invoices for now; payments and scheduled collections follow).
 */
@Injectable({ providedIn: 'root' })
export class BillingStore {
  private readonly billingApi = inject(BillingApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly invoicesSignal = signal<Invoice[]>([]);
  private readonly paymentsSignal = signal<InvoicePayment[]>([]);
  private readonly scheduledCollectionsSignal = signal<ScheduledCollection[]>([]);
  /** Month currently shown in the scheduled collections list (to reload it after changes). */
  private collectionsPeriod: Period | null = null;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly invoices = this.invoicesSignal.asReadonly();
  /** Payments of the invoice opened in the detail, in date order. */
  readonly payments = this.paymentsSignal.asReadonly();
  /** Scheduled collections of the loaded month, by week. */
  readonly scheduledCollections = this.scheduledCollectionsSignal.asReadonly();
  /** Still expected in the month: sum of the open (scheduled / rescheduled) collections. */
  readonly expectedCollectionsTotal = computed(
    () =>
      Math.round(
        this.scheduledCollectionsSignal()
          .filter((c) => c.isOpen())
          .reduce((sum, c) => sum + c.expectedAmount, 0) * 100,
      ) / 100,
  );
  /** Invoices with something left to collect (not voided, outstanding balance > 0). */
  readonly pendingInvoices = computed(() => this.invoicesSignal().filter((invoice) => invoice.isCollectable()));
  /** Accounts receivable: sum of the outstanding balances of non-voided invoices. */
  readonly totalOutstanding = computed(
    () => Math.round(this.pendingInvoices().reduce((sum, invoice) => sum + invoice.outstandingBalance, 0) * 100) / 100,
  );
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Only administration and accounting issue invoices and register collections (backend rule). */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.billingWrite));

  loadInvoices(): void {
    this.run(this.billingApi.getInvoices(), 'Failed to load invoices', (invoices) =>
      this.invoicesSignal.set(invoices),
    );
  }

  /** Issues an invoice and navigates to `navigateTo` when the API accepts it. */
  issueInvoice(command: IssueInvoiceCommand, navigateTo: string[]): void {
    this.run(this.billingApi.issueInvoice(command), 'Failed to issue invoice', (invoice) => {
      this.invoicesSignal.update((invoices) => [...invoices, invoice]);
      void this.router.navigate(navigateTo);
    });
  }

  /** Loads one invoice (fresh from the API) and its payments, in date order. */
  loadInvoiceDetail(id: number): void {
    this.paymentsSignal.set([]);
    this.refreshInvoice(id);
    this.run(this.billingApi.getPayments(id), 'Failed to load payments', (payments) =>
      this.paymentsSignal.set(sortByDate(payments)),
    );
  }

  /** Registers a payment; the backend recalculates collected amount, balance and status. */
  registerPayment(invoiceId: number, payment: InvoicePayment): void {
    const currency = this.getInvoiceById(invoiceId)?.currency ?? 'PEN';
    this.run(this.billingApi.registerPayment(invoiceId, payment, currency), 'Failed to register payment', (saved) => {
      this.paymentsSignal.update((payments) => sortByDate([...payments, saved]));
      this.refreshInvoice(invoiceId);
    });
  }

  /** Voids an invoice without payments. */
  voidInvoice(id: number): void {
    this.run(this.billingApi.voidInvoice(id), 'Failed to void invoice', (invoice) => this.upsertInvoice(invoice));
  }

  /** Loads the scheduled collections of a month (the backend requires year and month). */
  loadScheduledCollections(period: Period): void {
    this.collectionsPeriod = period;
    this.run(
      this.billingApi.getScheduledCollections(period.year, period.month),
      'Failed to load scheduled collections',
      (collections) => this.scheduledCollectionsSignal.set(sortByWeek(collections)),
    );
  }

  /** Schedules a collection; the backend derives the week from `expectedOn`. Reloads the shown month. */
  scheduleCollection(request: ScheduleCollectionRequest): void {
    this.run(this.billingApi.scheduleCollection(request), 'Failed to schedule collection', () =>
      this.reloadCollections(),
    );
  }

  /** Moves an open collection to the week of `expectedOn` (it may leave the shown month). */
  rescheduleCollection(id: number, expectedOn: string): void {
    this.run(this.billingApi.rescheduleCollection(id, expectedOn), 'Failed to reschedule collection', () =>
      this.reloadCollections(),
    );
  }

  cancelScheduledCollection(id: number): void {
    this.run(this.billingApi.cancelScheduledCollection(id), 'Failed to cancel collection', (cancelled) =>
      this.scheduledCollectionsSignal.update((collections) =>
        collections.map((c) => (c.id === cancelled.id ? cancelled : c)),
      ),
    );
  }

  getInvoiceById(id: number): Invoice | undefined {
    return this.invoicesSignal().find((invoice) => invoice.id === id);
  }

  private reloadCollections(): void {
    if (this.collectionsPeriod) {
      this.loadScheduledCollections(this.collectionsPeriod);
    }
  }

  private refreshInvoice(id: number): void {
    this.run(this.billingApi.getInvoiceById(id), 'Failed to load invoice', (invoice) => this.upsertInvoice(invoice));
  }

  private upsertInvoice(invoice: Invoice): void {
    this.invoicesSignal.update((invoices) =>
      invoices.some((i) => i.id === invoice.id)
        ? invoices.map((i) => (i.id === invoice.id ? invoice : i))
        : [...invoices, invoice],
    );
  }

  countByStatus(status: InvoiceStatus | null): number {
    const invoices = this.invoicesSignal();
    return status === null ? invoices.length : invoices.filter((invoice) => invoice.status === status).length;
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private run<T>(request: Observable<T>, fallback: string, onSuccess: (value: T) => void): void {
    this.pendingSignal.update((pending) => pending + 1);
    this.errorSignal.set(null);
    request.subscribe({
      next: (value) => {
        onSuccess(value);
        this.pendingSignal.update((pending) => pending - 1);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : fallback);
        this.pendingSignal.update((pending) => pending - 1);
      },
    });
  }
}
