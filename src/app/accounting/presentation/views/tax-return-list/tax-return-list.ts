import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TreasuryStore } from '../../../../treasury/application/treasury.store';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { AccountingStore } from '../../../application/accounting.store';
import { PayTaxReturnCommand } from '../../../domain/model/tax-return.commands';
import { TaxReturn } from '../../../domain/model/tax-return.entity';
import { previousReturn, returnFor } from '../../../domain/services/tax-return-figures';
import { PayTaxReturnData, PayTaxReturnDialog } from '../../components/pay-tax-return-dialog/pay-tax-return-dialog';

const today = new Date();

/**
 * The tax return of a month (`/accounting/tax-returns`): prepare it when there is none (its figures come from the
 * journal of the month and stay fixed), and pay it. Next to it, the month before, whose credit this one carries.
 * Admin and accounting prepare and pay; management only reads.
 */
@Component({
  selector: 'app-tax-return-list',
  imports: [
    DatePipe,
    DecimalPipe,
    PercentPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    PageHeader,
    PeriodSelector,
    StatusChip,
  ],
  templateUrl: './tax-return-list.html',
  styleUrl: './tax-return-list.css',
})
export class TaxReturnList implements OnInit {
  private readonly accountingStore = inject(AccountingStore);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly taxReturn = computed(() => returnFor(this.accountingStore.taxReturns(), this.period()));
  readonly previous = computed(() => previousReturn(this.accountingStore.taxReturns(), this.period()));
  /** Rate of the income tax prepayment in force at the end of the month, for its label. */
  readonly prepaymentRate = computed(() => this.accountingStore.taxParameters()?.incomeTaxPrepayment ?? null);
  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly canWrite = this.accountingStore.canWrite;

  constructor() {
    effect(() => {
      const period = this.period();
      untracked(() => this.accountingStore.loadTaxParametersAt(toIsoDate(new Date(period.year, period.month, 0))));
    });
  }

  ngOnInit(): void {
    this.accountingStore.clearError();
    this.accountingStore.loadTaxReturns();
    if (this.canWrite() && this.treasuryStore.bankAccounts().length === 0) {
      this.treasuryStore.loadBankAccounts();
    }
  }

  label(period: Period): string {
    return period.label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  }

  accountLabel(taxReturn: TaxReturn): string {
    const account = this.treasuryStore.getBankAccountById(taxReturn.bankAccountId);
    return account ? `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}` : '';
  }

  onPrepare(): void {
    this.accountingStore.prepareTaxReturn(this.period());
  }

  onPay(taxReturn: TaxReturn): void {
    this.dialog
      .open<PayTaxReturnDialog, PayTaxReturnData, PayTaxReturnCommand>(PayTaxReturnDialog, {
        data: { taxReturn, label: this.label(taxReturn.period()), bankAccounts: this.treasuryStore.bankAccounts() },
        width: '520px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.accountingStore.payTaxReturn(taxReturn.id, command, () => this.treasuryStore.loadBankAccounts());
        }
      });
  }
}
