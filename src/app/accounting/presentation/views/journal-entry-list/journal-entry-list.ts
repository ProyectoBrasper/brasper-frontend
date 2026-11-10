import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, Injector, input, OnInit, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { AccountingStore } from '../../../application/accounting.store';
import { ReverseJournalEntryCommand } from '../../../domain/model/journal-entry.commands';
import { JournalEntry } from '../../../domain/model/journal-entry.entity';
import { entryLabel, lineTotals } from '../../../domain/services/journal-entry-figures';
import { ReverseJournalEntryDialog } from '../../components/reverse-journal-entry-dialog/reverse-journal-entry-dialog';

const today = new Date();

/**
 * The journal of a month (`/accounting/journal-entries`): every entry with its totals, its source and whether it was
 * reversed; a row opens its lines. Automatic entries come from invoices, expenses and payments and can only be
 * reversed. Admin and accounting register manual entries and reverse; management only reads. `?year=&month=&open=`
 * opens a month with one entry expanded (where the manual entry form lands after registering).
 */
@Component({
  selector: 'app-journal-entry-list',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    PageHeader,
    PeriodSelector,
  ],
  templateUrl: './journal-entry-list.html',
  styleUrl: './journal-entry-list.css',
})
export class JournalEntryList implements OnInit {
  private readonly accountingStore = inject(AccountingStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);

  /** Query parameters, bound by `withComponentInputBinding`. */
  readonly year = input<string>();
  readonly month = input<string>();
  readonly open = input<string>();
  /** Entry to expand when the first month arrives (the one just registered). */
  private openAfterLoad: number | null = null;

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly expandedId = signal<number | null>(null);
  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly canWrite = this.accountingStore.canWrite;
  readonly columns = computed(() => {
    const columns = ['expand', 'id', 'entryDate', 'description', 'source', 'totalDebit', 'totalCredit', 'status'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<JournalEntry>(this.accountingStore.journalEntries());
    const paginator = this.paginator();
    if (paginator) {
      source.paginator = paginator;
    }
    return source;
  });

  constructor() {
    this.accountingStore.clearError();
    // The chart gives the names next to the codes; the projects, the codes of the lines that have one.
    if (this.accountingStore.ledgerAccounts().length === 0) {
      this.accountingStore.loadLedgerAccounts();
    }
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
  }

  ngOnInit(): void {
    const year = Number(this.year());
    const month = Number(this.month());
    if (Number.isInteger(year) && year > 0 && Number.isInteger(month) && month >= 1 && month <= 12) {
      this.period.set(new Period(year, month));
    }
    this.openAfterLoad = Number(this.open()) || null;
    // Created here so the month from the query parameters is the first one loaded.
    effect(
      () => {
        const period = this.period();
        untracked(() => {
          this.expandedId.set(this.openAfterLoad);
          this.openAfterLoad = null;
          this.accountingStore.loadJournalEntries(period);
        });
      },
      { injector: this.injector },
    );
  }

  /** What the entry is: the typed description for a manual one, the translated source and its document for an automatic one. */
  description(entry: JournalEntry): string {
    const label = entryLabel(entry);
    if (!label) {
      return entry.description;
    }
    const text = this.translate.instant(label.key, label.params) as string;
    return label.ref === null ? text : `${text} #${label.ref}`;
  }

  accountName(code: string): string {
    return this.accountingStore.getLedgerAccountByCode(code)?.name ?? '';
  }

  projectCode(projectId: number | null): string {
    return projectId === null ? '' : (this.projectsStore.getProjectById(projectId)?.code ?? `#${projectId}`);
  }

  totals(entry: JournalEntry): { debit: number; credit: number } {
    return lineTotals(entry.lines);
  }

  isExpanded(entry: JournalEntry): boolean {
    return this.expandedId() === entry.id;
  }

  toggle(entry: JournalEntry): void {
    this.expandedId.update((id) => (id === entry.id ? null : entry.id));
  }

  onReverse(entry: JournalEntry): void {
    this.dialog
      .open<ReverseJournalEntryDialog, { entry: JournalEntry; description: string }, ReverseJournalEntryCommand>(
        ReverseJournalEntryDialog,
        { data: { entry, description: this.description(entry) }, width: '480px' },
      )
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.accountingStore.reverseJournalEntry(entry.id, command);
        }
      });
  }
}
