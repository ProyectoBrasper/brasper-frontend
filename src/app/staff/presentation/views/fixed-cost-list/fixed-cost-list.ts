import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Period } from '../../../../shared/domain/model/period';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../../treasury/application/treasury.store';
import { StaffStore } from '../../../application/staff.store';
import { RegisterFixedCostPaymentCommand } from '../../../domain/model/fixed-cost.commands';
import { FixedCost } from '../../../domain/model/fixed-cost.entity';
import {
  RegisterFixedCostPaymentData,
  RegisterFixedCostPaymentDialog,
} from '../../components/register-fixed-cost-payment-dialog/register-fixed-cost-payment-dialog';

const today = new Date();

/**
 * Recurring monthly costs (`/staff/fixed-costs`) with what was paid and what is still owed in the chosen
 * month. Admin and accounting create, edit, pay and deactivate (for good); management only reads.
 */
@Component({
  selector: 'app-fixed-cost-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
  ],
  templateUrl: './fixed-cost-list.html',
  styleUrl: './fixed-cost-list.css',
})
export class FixedCostList {
  private readonly staffStore = inject(StaffStore);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly loading = this.staffStore.loading;
  readonly error = this.staffStore.error;
  readonly canWrite = this.staffStore.canWrite;
  readonly monthlyTotal = this.staffStore.monthlyFixedCostTotal;
  readonly paidTotal = this.staffStore.paidInPeriod;
  readonly pendingTotal = this.staffStore.pendingInPeriod;
  readonly displayedColumns = computed(() => {
    const columns = ['code', 'concept', 'type', 'employee', 'monthlyAmount', 'weeks', 'paid', 'pending'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    // Reading the payments makes the table refresh its paid / pending columns when they change.
    this.staffStore.payments();
    const source = new MatTableDataSource<FixedCost>(this.staffStore.fixedCosts());
    source.sortingDataAccessor = (cost, column) => {
      switch (column) {
        case 'employee':
          return this.employeeName(cost.employeeId).toLowerCase();
        case 'paid':
          return this.paid(cost);
        case 'pending':
          return this.pending(cost);
        case 'weeks':
          return cost.expectedWeeks[0] ?? 0;
        case 'monthlyAmount':
          return cost.monthlyAmount;
        default:
          return String(cost[column as keyof FixedCost] ?? '').toLowerCase();
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

  constructor() {
    effect(() => {
      const period = this.period();
      untracked(() => this.staffStore.loadPayments(period));
    });
    this.staffStore.loadFixedCosts();
    if (this.staffStore.employees().length === 0) {
      this.staffStore.loadEmployees();
    }
    if (this.canWrite() && this.treasuryStore.bankAccounts().length === 0) {
      this.treasuryStore.loadBankAccounts();
    }
  }

  employeeName(employeeId: number | null): string {
    return this.staffStore.getEmployeeById(employeeId)?.fullName ?? '';
  }

  paid(cost: FixedCost): number {
    return this.staffStore.paidAmount(cost.id);
  }

  pending(cost: FixedCost): number {
    return this.staffStore.pendingAmount(cost.id);
  }

  onRegisterPayment(cost: FixedCost): void {
    this.dialog
      .open<RegisterFixedCostPaymentDialog, RegisterFixedCostPaymentData, RegisterFixedCostPaymentCommand>(
        RegisterFixedCostPaymentDialog,
        {
          data: {
            fixedCost: cost,
            period: this.period(),
            pending: this.pending(cost),
            bankAccounts: this.treasuryStore.bankAccounts(),
          },
          width: '520px',
        },
      )
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.staffStore.registerPayment(cost.id, command);
        }
      });
  }

  onDeactivate(cost: FixedCost): void {
    ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant('fixedCosts.deactivateTitle'),
      message: this.translate.instant('fixedCosts.deactivateMessage', { code: cost.code, concept: cost.concept }),
    }).subscribe(() => this.staffStore.deactivateFixedCost(cost.id));
  }
}
