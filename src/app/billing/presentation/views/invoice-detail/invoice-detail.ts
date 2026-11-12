import { DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../../treasury/application/treasury.store';
import { BillingStore } from '../../../application/billing.store';
import { InvoicePayment } from '../../../domain/model/invoice-payment.entity';
import { InvoiceAmountsSummary } from '../../components/invoice-amounts-summary/invoice-amounts-summary';
import {
  RegisterPaymentData,
  RegisterPaymentDialog,
} from '../../components/register-payment-dialog/register-payment-dialog';

/**
 * Invoice detail (`/billing/invoices/:id`): data, amounts, collection progress and payments; register
 * a payment (while there is a balance) or void it (only without payments). Writing: admin and accounting.
 */
@Component({
  selector: 'app-invoice-detail',
  imports: [
    DatePipe,
    PercentPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
    InvoiceAmountsSummary,
  ],
  templateUrl: './invoice-detail.html',
  styleUrl: './invoice-detail.css',
})
export class InvoiceDetail {
  private readonly billingStore = inject(BillingStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input.required<string>();

  readonly invoiceId = computed(() => Number(this.id()));
  readonly invoice = computed(() => this.billingStore.invoices().find((i) => i.id === this.invoiceId()));
  readonly project = computed(() => {
    const invoice = this.invoice();
    return invoice ? this.projectsStore.getProjectById(invoice.projectId) : undefined;
  });
  readonly client = computed(() => {
    const invoice = this.invoice();
    return invoice ? this.projectsStore.getClientById(invoice.clientId) : undefined;
  });
  readonly payments = this.billingStore.payments;
  readonly loading = this.billingStore.loading;
  readonly error = this.billingStore.error;
  readonly canWrite = this.billingStore.canWrite;
  /** Collected share of the total (0..1), for the progress bar. */
  readonly collectedShare = computed(() => {
    const invoice = this.invoice();
    return invoice && invoice.total > 0 ? Math.min(1, invoice.collectedAmount / invoice.total) : 0;
  });
  readonly paymentColumns = ['receivedOn', 'type', 'account', 'reference', 'amount'];

  constructor() {
    effect(() => {
      const id = this.invoiceId();
      untracked(() => {
        this.billingStore.loadInvoiceDetail(id);
        if (this.treasuryStore.bankAccounts().length === 0) {
          this.treasuryStore.loadBankAccounts();
        }
        if (this.projectsStore.projects().length === 0) {
          this.projectsStore.loadProjects();
        }
        if (this.projectsStore.clients().length === 0) {
          this.projectsStore.loadClients();
        }
      });
    });
  }

  accountLabel(payment: InvoicePayment): string {
    const account = this.treasuryStore.getBankAccountById(payment.bankAccountId);
    return account ? `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}` : '—';
  }

  onRegisterPayment(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.dialog
      .open<RegisterPaymentDialog, RegisterPaymentData, InvoicePayment>(RegisterPaymentDialog, {
        data: { invoice, payments: this.payments(), bankAccounts: this.treasuryStore.bankAccounts() },
        width: '520px',
      })
      .afterClosed()
      .subscribe((payment) => {
        if (payment) {
          this.billingStore.registerPayment(invoice.id, payment);
        }
      });
  }

  onVoid(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant('invoices.voidTitle'),
      message: this.translate.instant('invoices.voidMessage', { number: invoice.number }),
    }).subscribe(() => this.billingStore.voidInvoice(invoice.id));
  }
}
