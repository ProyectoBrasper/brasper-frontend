import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ExpensesStore } from '../../../../expenses/application/expenses.store';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { CashFlowWeek } from '../../../../shared/domain/model/cash-flow-week';
import { PAYMENT_STATUSES, PaymentStatus } from '../../../../shared/domain/model/payment-status';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { RegisterPayablePaymentCommand } from '../../../domain/model/payable.commands';
import { Payable } from '../../../domain/model/payable.entity';
import {
  RegisterPayablePaymentData,
  RegisterPayablePaymentDialog,
} from '../../components/register-payable-payment-dialog/register-payable-payment-dialog';
import { ReschedulePayableDialog } from '../../components/reschedule-payable-dialog/reschedule-payable-dialog';

const AMOUNT_COLUMNS = ['totalAmount', 'paidAmount', 'balance'] as const;

/**
 * What the company owes (`/treasury/payables`) with the outstanding balance and a status filter. Admin and
 * accounting pay (the account is required) and reschedule unpaid payables; management only reads. Creating one
 * by hand comes with its form (next PR); pending expenses create theirs by themselves.
 */
@Component({
  selector: 'app-payable-list',
  imports: [
    DatePipe,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './payable-list.html',
  styleUrl: './payable-list.css',
})
export class PayableList implements OnInit {
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly expensesStore = inject(ExpensesStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly loading = computed(() => this.treasuryStore.loading() || this.expensesStore.loading() || this.projectsStore.loading());
  readonly error = computed(() => this.treasuryStore.error() ?? this.expensesStore.error() ?? this.projectsStore.error());
  readonly canWrite = this.treasuryStore.canWrite;
  readonly outstanding = this.treasuryStore.outstandingPayables;
  readonly statuses: readonly (PaymentStatus | null)[] = [null, ...PAYMENT_STATUSES];
  readonly statusFilter = signal<PaymentStatus | null>(null);
  readonly displayedColumns = computed(() => {
    const columns = ['concept', 'type', 'counterpart', 'week', ...AMOUNT_COLUMNS, 'status'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const status = this.statusFilter();
    const payables = this.treasuryStore.payables().filter((p) => status === null || p.status === status);
    const source = new MatTableDataSource<Payable>(payables);
    source.sortingDataAccessor = (payable, column) => {
      switch (column) {
        case 'week':
          return payable.year * 10000 + payable.month * 100 + payable.week;
        case 'counterpart':
          return this.supplierName(payable).toLowerCase();
        default:
          return (AMOUNT_COLUMNS as readonly string[]).includes(column)
            ? (payable[column as (typeof AMOUNT_COLUMNS)[number]] as number)
            : String(payable[column as keyof Payable] ?? '').toLowerCase();
      }
    };
    const sort = this.sort();
    if (sort) {
      source.sort = sort;
    }
    const paginator = this.paginator();
    if (paginator) {
      source.paginator = paginator;
    }
    return source;
  });

  ngOnInit(): void {
    this.treasuryStore.loadPayables();
    if (this.expensesStore.suppliers().length === 0) {
      this.expensesStore.loadSuppliers();
    }
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
    if (this.canWrite() && this.treasuryStore.bankAccounts().length === 0) {
      this.treasuryStore.loadBankAccounts();
    }
  }

  count(status: PaymentStatus | null): number {
    return this.treasuryStore.countPayablesByStatus(status);
  }

  supplierName(payable: Payable): string {
    return this.expensesStore.getSupplierById(payable.supplierId)?.businessName ?? '';
  }

  projectCode(payable: Payable): string {
    return payable.projectId === null ? '' : (this.projectsStore.getProjectById(payable.projectId)?.code ?? '');
  }

  /** "Nov · sem. 2", like the mockup; the year shows only when it is not the current one. */
  weekLabel(payable: Payable): string {
    const locale = this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE';
    const month = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(payable.year, payable.month - 1, 1)))
      .replace('.', '');
    const monthLabel = month.charAt(0).toLocaleUpperCase(locale) + month.slice(1);
    const year = payable.year === new Date().getFullYear() ? '' : ` ${payable.year}`;
    return this.translate.instant('payables.weekShort', { month: monthLabel + year, number: payable.week });
  }

  week(payable: Payable): CashFlowWeek {
    return payable.cashFlowWeek();
  }

  onRegisterPayment(payable: Payable): void {
    this.dialog
      .open<RegisterPayablePaymentDialog, RegisterPayablePaymentData, RegisterPayablePaymentCommand>(
        RegisterPayablePaymentDialog,
        { data: { payable, bankAccounts: this.treasuryStore.bankAccounts() }, width: '520px' },
      )
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.payPayable(payable.id, command);
        }
      });
  }

  onReschedule(payable: Payable): void {
    this.dialog
      .open<ReschedulePayableDialog, Payable, CashFlowWeek>(ReschedulePayableDialog, { data: payable, width: '460px' })
      .afterClosed()
      .subscribe((week) => {
        if (week) {
          this.treasuryStore.reschedulePayable(payable.id, week);
        }
      });
  }
}
