import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { initialsOf } from '../../../../shared/presentation/initials';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { RegisterContributionCommand, RegisterPartnerCommand } from '../../../domain/model/partner.commands';
import { Partner, PartnerContribution } from '../../../domain/model/partner.entity';
import { contributionsIn, contributionsTotal } from '../../../domain/services/partner-figures';
import {
  RegisterContributionData,
  RegisterContributionDialog,
} from '../../components/register-contribution-dialog/register-contribution-dialog';
import { RegisterPartnerDialog } from '../../components/register-partner-dialog/register-partner-dialog';

const today = new Date();

/**
 * Partners and their contributions (`/treasury/partners`): one card per partner with what they put in overall, and
 * the contributions of the chosen month (the backend sends them inside each partner, so the month is filtered here).
 * Admin and accounting register partners and contributions; management only reads.
 */
@Component({
  selector: 'app-partner-list',
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
  ],
  templateUrl: './partner-list.html',
  styleUrl: './partner-list.css',
})
export class PartnerList implements OnInit {
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  /** In the order they were registered, as the mockup shows them (a new partner goes last). */
  readonly partners = computed(() => [...this.treasuryStore.partners()].sort((a, b) => a.id - b.id));
  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly rows = computed(() => contributionsIn(this.treasuryStore.partners(), this.period()));
  readonly periodTotal = computed(() => contributionsTotal(this.rows()));
  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;
  readonly canWrite = this.treasuryStore.canWrite;
  readonly columns = ['contributedOn', 'partner', 'concept', 'amount', 'reimbursable', 'destination'];

  ngOnInit(): void {
    this.treasuryStore.clearError();
    this.treasuryStore.loadPartners();
    if (this.treasuryStore.bankAccounts().length === 0) {
      this.treasuryStore.loadBankAccounts();
    }
  }

  initials(partner: Partner): string {
    return initialsOf(partner.fullName);
  }

  /** Where the money went: an account, an expense the partner paid out of pocket, or nowhere. */
  destination(contribution: PartnerContribution): string {
    if (contribution.bankAccountId !== null) {
      const account = this.treasuryStore.getBankAccountById(contribution.bankAccountId);
      return account ? `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}` : '…';
    }
    if (contribution.expenseId !== null) {
      return this.translate.instant('partners.expensePaid', { id: contribution.expenseId });
    }
    return this.translate.instant('partners.noAccount');
  }

  onRegisterPartner(): void {
    this.dialog
      .open<RegisterPartnerDialog, void, RegisterPartnerCommand>(RegisterPartnerDialog, { width: '480px' })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.registerPartner(command);
        }
      });
  }

  onRegisterContribution(partner: Partner): void {
    this.dialog
      .open<RegisterContributionDialog, RegisterContributionData, RegisterContributionCommand>(
        RegisterContributionDialog,
        { data: { partner, bankAccounts: this.treasuryStore.bankAccounts() }, width: '520px' },
      )
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.registerContribution(partner.id, command);
        }
      });
  }
}
