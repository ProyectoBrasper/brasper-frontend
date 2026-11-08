import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { Invoice } from '../domain/model/invoice.entity';
import { InvoiceStatus } from '../domain/model/invoice-status';
import { IssueInvoiceCommand } from '../domain/model/issue-invoice.command';
import { BillingApi } from '../infrastructure/billing-api';

/**
 * Billing context state (invoices for now; payments and scheduled collections follow).
 */
@Injectable({ providedIn: 'root' })
export class BillingStore {
  private readonly billingApi = inject(BillingApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly invoicesSignal = signal<Invoice[]>([]);
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly invoices = this.invoicesSignal.asReadonly();
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

  getInvoiceById(id: number): Invoice | undefined {
    return this.invoicesSignal().find((invoice) => invoice.id === id);
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
