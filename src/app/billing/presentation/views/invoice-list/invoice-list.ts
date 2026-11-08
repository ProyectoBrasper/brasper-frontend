import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BillingStore } from '../../../application/billing.store';
import { Invoice } from '../../../domain/model/invoice.entity';
import { INVOICE_STATUSES, InvoiceStatus } from '../../../domain/model/invoice-status';

const AMOUNT_COLUMNS = ['taxableBase', 'igv', 'total', 'collectedAmount', 'outstandingBalance'] as const;

/**
 * Issued invoices with receivables summary and status filter. The detail and the issue form
 * come in the next PRs.
 */
@Component({
  selector: 'app-invoice-list',
  imports: [
    DatePipe,
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
  templateUrl: './invoice-list.html',
  styleUrl: './invoice-list.css',
})
export class InvoiceList implements OnInit {
  private readonly billingStore = inject(BillingStore);
  private readonly projectsStore = inject(ProjectsStore);

  readonly loading = computed(() => this.billingStore.loading() || this.projectsStore.loading());
  readonly error = computed(() => this.billingStore.error() ?? this.projectsStore.error());
  readonly totalOutstanding = this.billingStore.totalOutstanding;
  readonly pendingCount = computed(() => this.billingStore.pendingInvoices().length);
  readonly statuses: readonly (InvoiceStatus | null)[] = [null, ...INVOICE_STATUSES];
  readonly statusFilter = signal<InvoiceStatus | null>(null);
  readonly displayedColumns = [
    'number',
    'issuedOn',
    'project',
    'client',
    ...AMOUNT_COLUMNS,
    'status',
  ];

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const status = this.statusFilter();
    const invoices = this.billingStore.invoices().filter((i) => status === null || i.status === status);
    const source = new MatTableDataSource<Invoice>(invoices);
    source.sortingDataAccessor = (invoice, column) => {
      switch (column) {
        case 'project':
          return this.projectCode(invoice.projectId);
        case 'client':
          return this.clientName(invoice.clientId).toLowerCase();
        default:
          return (AMOUNT_COLUMNS as readonly string[]).includes(column)
            ? (invoice[column as (typeof AMOUNT_COLUMNS)[number]] as number)
            : String(invoice[column as keyof Invoice] ?? '');
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
    this.billingStore.loadInvoices();
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
    if (this.projectsStore.clients().length === 0) {
      this.projectsStore.loadClients();
    }
  }

  count(status: InvoiceStatus | null): number {
    return this.billingStore.countByStatus(status);
  }

  projectCode(projectId: number): string {
    return this.projectsStore.getProjectById(projectId)?.code ?? '';
  }

  clientName(clientId: number): string {
    return this.projectsStore.getClientById(clientId)?.businessName ?? '';
  }
}
