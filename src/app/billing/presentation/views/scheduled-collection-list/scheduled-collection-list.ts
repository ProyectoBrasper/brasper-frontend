import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { Period } from '../../../../shared/domain/model/period';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BillingStore } from '../../../application/billing.store';
import { ScheduledCollection } from '../../../domain/model/scheduled-collection.entity';
import { ScheduleCollectionRequest } from '../../../infrastructure/scheduled-collections-api-endpoint';
import {
  ScheduledCollectionData,
  ScheduledCollectionDialog,
  ScheduledCollectionResult,
} from '../../components/scheduled-collection-dialog/scheduled-collection-dialog';

const today = new Date();

/**
 * Collections expected per cash-flow week of a month (`/billing/scheduled-collections`), with the
 * total still expected. Admin and accounting schedule, reschedule and cancel open collections.
 */
@Component({
  selector: 'app-scheduled-collection-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
    StatusChip,
  ],
  templateUrl: './scheduled-collection-list.html',
  styleUrl: './scheduled-collection-list.css',
})
export class ScheduledCollectionList {
  private readonly billingStore = inject(BillingStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly collections = this.billingStore.scheduledCollections;
  readonly total = this.billingStore.expectedCollectionsTotal;
  readonly loading = this.billingStore.loading;
  readonly error = this.billingStore.error;
  readonly canWrite = this.billingStore.canWrite;
  readonly columns = computed(() => {
    const columns = ['week', 'project', 'invoice', 'expectedAmount', 'status', 'notes'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  constructor() {
    effect(() => {
      const period = this.period();
      untracked(() => this.billingStore.loadScheduledCollections(period));
    });
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
    if (this.billingStore.invoices().length === 0) {
      this.billingStore.loadInvoices();
    }
  }

  project(projectId: number) {
    return this.projectsStore.getProjectById(projectId);
  }

  invoiceNumber(invoiceId: number | null): string {
    return invoiceId === null ? '' : (this.billingStore.getInvoiceById(invoiceId)?.number ?? '');
  }

  onSchedule(): void {
    this.openDialog(null).subscribe((result) => {
      if (result && 'projectId' in result) {
        this.billingStore.scheduleCollection(result as ScheduleCollectionRequest);
      }
    });
  }

  onReschedule(collection: ScheduledCollection): void {
    this.openDialog(collection).subscribe((result) => {
      if (result) {
        this.billingStore.rescheduleCollection(collection.id, result.expectedOn);
      }
    });
  }

  onCancelCollection(collection: ScheduledCollection): void {
    const project = this.project(collection.projectId);
    ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant('collections.cancelTitle'),
      message: this.translate.instant('collections.cancelMessage', {
        week: collection.week,
        project: project?.code ?? '',
      }),
    }).subscribe(() => this.billingStore.cancelScheduledCollection(collection.id));
  }

  /** Proposed date: today if it is in the shown month, otherwise its first day. */
  private defaultDate(): Date {
    const { year, month } = this.period();
    return today.getFullYear() === year && today.getMonth() + 1 === month ? today : new Date(year, month - 1, 1);
  }

  private openDialog(collection: ScheduledCollection | null) {
    return this.dialog
      .open<ScheduledCollectionDialog, ScheduledCollectionData, ScheduledCollectionResult>(ScheduledCollectionDialog, {
        data: {
          collection,
          projects: this.projectsStore.projects(),
          defaultDate: collection ? collection.cashFlowWeek.startDate() : this.defaultDate(),
        },
        width: '480px',
      })
      .afterClosed();
  }
}
