import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { COST_CATEGORIES, CostCategory } from '../../../../projects/domain/model/cost-category';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { Money } from '../../../../shared/domain/model/money';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ExpensesStore } from '../../../application/expenses.store';
import { Expense } from '../../../domain/model/expense.entity';

/** Project filter values: every expense, general expenses (no project), or a real project id. */
export const ALL_PROJECTS = -1;
export const GENERAL_PROJECT = 0;
export const ALL_CATEGORIES = 'ALL';

/** Sums amounts in cents so the total never drifts (e.g. 0.1 + 0.2). */
export const sumAmounts = (amounts: readonly number[]): number =>
  amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0) / 100;

/**
 * Expenses with project and category filters. Annulled expenses stay listed (struck through) and are
 * left out of the total. Correcting and annulling: admin, accounting and engineer; registering: admin and accounting.
 */
@Component({
  selector: 'app-expense-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
})
export class ExpenseList implements OnInit {
  private readonly expensesStore = inject(ExpensesStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly loading = computed(() => this.expensesStore.loading() || this.projectsStore.loading());
  readonly error = computed(() => this.expensesStore.error() ?? this.projectsStore.error());
  readonly canWrite = this.expensesStore.canWrite;
  /** Registering needs accounts and partners, which only finance roles can read. */
  readonly canRegister = computed(() => this.expensesStore.canWrite() && this.expensesStore.canChoosePayment());
  readonly projects = this.projectsStore.projects;
  readonly categories = COST_CATEGORIES;
  readonly allProjects = ALL_PROJECTS;
  readonly generalProject = GENERAL_PROJECT;
  readonly allCategories = ALL_CATEGORIES;
  readonly projectFilter = signal<number>(ALL_PROJECTS);
  readonly categoryFilter = signal<CostCategory | typeof ALL_CATEGORIES>(ALL_CATEGORIES);

  readonly displayedColumns = computed(() => {
    const columns = ['spentOn', 'project', 'supplier', 'category', 'description', 'voucher', 'taxableBase', 'igv', 'total', 'status'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  /** Expenses that match the filters, annulled included. */
  readonly filtered = computed(() => {
    const project = this.projectFilter();
    const category = this.categoryFilter();
    return this.expensesStore
      .expenses()
      .filter((e) => project === ALL_PROJECTS || (project === GENERAL_PROJECT ? e.projectId === null : e.projectId === project))
      .filter((e) => category === ALL_CATEGORIES || e.category === category);
  });

  /** Total of the filtered expenses without the annulled ones. */
  readonly total = computed(() => sumAmounts(this.filtered().filter((e) => e.isActive()).map((e) => e.total)));

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<Expense>(this.filtered());
    source.sortingDataAccessor = (expense, column) => {
      switch (column) {
        case 'project':
          return this.projectCode(expense.projectId);
        case 'supplier':
          return this.supplierName(expense.supplierId).toLowerCase();
        case 'voucher':
          return `${expense.voucherType}${expense.voucherNumber}`;
        case 'status':
          return expense.annulled ? 'ANNULLED' : expense.paymentStatus;
        default:
          return (expense[column as keyof Expense] as string | number | null) ?? '';
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
    this.expensesStore.loadExpenses();
    this.expensesStore.loadSuppliers();
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
  }

  projectCode(projectId: number | null): string {
    return projectId === null ? '' : (this.projectsStore.getProjectById(projectId)?.code ?? '');
  }

  supplierName(supplierId: number | null): string {
    return this.expensesStore.getSupplierById(supplierId)?.businessName ?? '';
  }

  /** Label of the status column: an annulled expense shows that, otherwise its payment status. */
  statusOf(expense: Expense): string {
    return expense.annulled ? 'ANNULLED' : expense.paymentStatus;
  }

  onAnnul(expense: Expense): void {
    ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant('expenses.annulTitle'),
      message: this.translate.instant('expenses.annulMessage', {
        description: expense.description || this.translate.instant('costCategory.' + expense.category),
        total: new Money(expense.total, expense.currency).format('es-PE'),
      }),
    }).subscribe(() => this.expensesStore.annulExpense(expense.id));
  }
}
