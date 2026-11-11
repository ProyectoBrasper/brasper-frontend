import { PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ReportingStore } from '../../../application/reporting.store';
import { ProjectProfitability } from '../../../domain/model/project-profitability';
import {
  costByCategory,
  filterProfitability,
  PROFITABILITY_FILTERS,
  ProfitabilityFilter,
} from '../../../domain/services/profitability-figures';

const today = new Date();

/**
 * The profitability of the projects (`/reports/project-profitability`), as the backend calculates it. A row opens to
 * show its costs by category and its billing. Read by admin, management and accounting.
 */
@Component({
  selector: 'app-project-profitability-view',
  imports: [
    PercentPipe,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
    StatusChip,
  ],
  templateUrl: './project-profitability-view.html',
  styleUrl: './project-profitability-view.css',
})
export class ProjectProfitabilityView {
  private readonly reportingStore = inject(ReportingStore);
  private readonly translate = inject(TranslateService);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly filters = PROFITABILITY_FILTERS;
  readonly filter = signal<ProfitabilityFilter>('ACTIVE');
  readonly expandedId = signal<number | null>(null);
  readonly loading = this.reportingStore.loading;
  readonly error = this.reportingStore.error;
  readonly displayedColumns = [
    'expand',
    'project',
    'status',
    'budget',
    'estimatedCost',
    'actualCost',
    'costDeviation',
    'grossProfit',
    'margin',
    'accumulatedProgress',
    'recognizedProfitInPeriod',
  ];

  readonly sort = viewChild(MatSort);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<ProjectProfitability>(
      filterProfitability(this.reportingStore.profitability(), this.filter()),
    );
    source.sortingDataAccessor = (project, column) => {
      switch (column) {
        case 'project':
          return project.code;
        case 'status':
          return project.status;
        case 'budget':
          return project.budget;
        case 'estimatedCost':
          return project.estimatedCost;
        case 'actualCost':
          return project.actualCost;
        case 'costDeviation':
          return project.costDeviation;
        case 'grossProfit':
          return project.grossProfit;
        case 'margin':
          return project.margin;
        case 'accumulatedProgress':
          return project.accumulatedProgress;
        default:
          return project.recognizedProfitInPeriod;
      }
    };
    const sort = this.sort();
    if (sort) {
      source.sort = sort;
    }
    return source;
  });

  constructor() {
    this.reportingStore.clearError();
    effect(() => {
      const period = this.period();
      untracked(() => this.reportingStore.loadPortfolioProfitability(period));
    });
  }

  count(filter: ProfitabilityFilter): number {
    return filterProfitability(this.reportingStore.profitability(), filter).length;
  }

  categories(project: ProjectProfitability) {
    return costByCategory(project);
  }

  periodLabel(): string {
    return this.period().label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  }

  isExpanded(project: ProjectProfitability): boolean {
    return this.expandedId() === project.projectId;
  }

  toggle(project: ProjectProfitability): void {
    this.expandedId.update((id) => (id === project.projectId ? null : project.projectId));
  }
}
