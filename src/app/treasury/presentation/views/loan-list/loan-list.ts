import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toPercent } from '../../../../shared/domain/model/percentage';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { Loan, LOAN_TYPES, LoanType } from '../../../domain/model/loan.entity';

const AMOUNT_COLUMNS = ['principal', 'outstandingBalance'] as const;

/**
 * Loans the company received or granted (`/treasury/loans`) with a filter by type. Admin and accounting register
 * them; management only reads. A row opens the loan detail, where installments are scheduled and paid.
 */
@Component({
  selector: 'app-loan-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './loan-list.html',
  styleUrl: './loan-list.css',
})
export class LoanList implements OnInit {
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly translate = inject(TranslateService);

  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;
  readonly canWrite = this.treasuryStore.canWrite;
  readonly types: readonly (LoanType | null)[] = [null, ...LOAN_TYPES];
  readonly typeFilter = signal<LoanType | null>(null);
  readonly displayedColumns = [
    'type',
    'counterparty',
    'principal',
    'interestRate',
    'disbursedOn',
    'bankAccountId',
    'outstandingBalance',
    'status',
  ];

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const type = this.typeFilter();
    const loans = this.treasuryStore.loans().filter((loan) => type === null || loan.type === type);
    const source = new MatTableDataSource<Loan>(loans);
    source.sortingDataAccessor = (loan, column) => {
      switch (column) {
        case 'bankAccountId':
          return this.accountLabel(loan).toLowerCase();
        case 'counterparty':
          return loan.counterparty.toLowerCase();
        default:
          return (AMOUNT_COLUMNS as readonly string[]).includes(column)
            ? (loan[column as (typeof AMOUNT_COLUMNS)[number]] as number)
            : String(loan[column as keyof Loan] ?? '');
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
    this.treasuryStore.loadLoans();
    if (this.treasuryStore.bankAccounts().length === 0) {
      this.treasuryStore.loadBankAccounts();
    }
  }

  count(type: LoanType | null): number {
    return this.treasuryStore.countLoansByType(type);
  }

  /** "12.00 % anual" (the API sends a fraction). */
  rateLabel(loan: Loan): string {
    return this.translate.instant('loans.rateValue', { rate: toPercent(loan.interestRate).toFixed(2) });
  }

  /** "BCP · 193-2456789-0-12", or empty while the accounts load. */
  accountLabel(loan: Loan): string {
    const account = this.treasuryStore.getBankAccountById(loan.bankAccountId);
    return account ? `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}` : '';
  }
}
