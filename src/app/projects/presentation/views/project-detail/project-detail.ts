import { DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ProjectsStore } from '../../../application/projects.store';
import { CostEstimate } from '../../../domain/model/cost-estimate.entity';
import { COST_CATEGORIES } from '../../../domain/model/cost-category';
import { ProgressRecord } from '../../../domain/model/progress-record.entity';
import { CostEstimateDialog, CostEstimateData } from '../../components/cost-estimate-dialog/cost-estimate-dialog';
import { CostEstimateTable } from '../../components/cost-estimate-table/cost-estimate-table';
import { ProgressRecordTable } from '../../components/progress-record-table/progress-record-table';
import {
  RegisterProgressData,
  RegisterProgressDialog,
} from '../../components/register-progress-dialog/register-progress-dialog';

/**
 * Project detail (`/projects/:id`): summary, client, monthly progress and cost estimates, with the
 * actions the project's status allows (start, cancel, edit, register progress, set estimates).
 */
@Component({
  selector: 'app-project-detail',
  imports: [
    DatePipe,
    PercentPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
    ProgressRecordTable,
    CostEstimateTable,
  ],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
})
export class ProjectDetail {
  private readonly projectsStore = inject(ProjectsStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input.required<string>();

  readonly projectId = computed(() => Number(this.id()));
  readonly project = computed(() => this.projectsStore.projects().find((p) => p.id === this.projectId()));
  readonly client = computed(() => {
    const project = this.project();
    return project ? this.projectsStore.getClientById(project.clientId) : undefined;
  });
  readonly progressRecords = this.projectsStore.progressRecords;
  readonly costEstimates = this.projectsStore.costEstimates;
  readonly loading = this.projectsStore.loading;
  readonly error = this.projectsStore.error;
  readonly canWrite = this.projectsStore.canWrite;

  readonly canEditEstimates = computed(() => this.canWrite() && !!this.project()?.isOpen());
  readonly canAddEstimate = computed(
    () => this.canEditEstimates() && this.costEstimates().length < COST_CATEGORIES.length,
  );

  constructor() {
    // Load (or reload) only when the route id changes; untracked so store reads inside the load
    // (e.g. the clients list) do not re-trigger it.
    effect(() => {
      const projectId = this.projectId();
      untracked(() => this.projectsStore.loadProjectDetail(projectId));
    });
  }

  onStart(): void {
    const project = this.project();
    if (!project) return;
    this.confirm('projects.startTitle', 'projects.startMessage').subscribe(() =>
      this.projectsStore.startProject(project.id),
    );
  }

  onCancelProject(): void {
    const project = this.project();
    if (!project) return;
    this.confirm('projects.cancelTitle', 'projects.cancelMessage').subscribe(() =>
      this.projectsStore.cancelProject(project.id),
    );
  }

  onEdit(): void {
    void this.router.navigate(['/projects', this.projectId(), 'edit']);
  }

  onRegisterProgress(): void {
    const project = this.project();
    if (!project) return;
    this.dialog
      .open<RegisterProgressDialog, RegisterProgressData, ProgressRecord>(RegisterProgressDialog, {
        data: { project, records: this.progressRecords() },
        width: '480px',
      })
      .afterClosed()
      .subscribe((record) => {
        if (record) {
          this.projectsStore.registerProgress(project.id, record);
        }
      });
  }

  onSetCostEstimate(estimate: CostEstimate | null): void {
    const project = this.project();
    if (!project) return;
    this.dialog
      .open<CostEstimateDialog, CostEstimateData, CostEstimate>(CostEstimateDialog, {
        data: {
          projectId: project.id,
          currency: project.currency,
          estimate,
          usedCategories: this.costEstimates().map((e) => e.category),
        },
        width: '440px',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.projectsStore.setCostEstimate(project.id, saved);
        }
      });
  }

  private confirm(titleKey: string, messageKey: string) {
    const project = this.project()!;
    return ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant(titleKey),
      message: this.translate.instant(messageKey, { code: project.code, name: project.name }),
    });
  }
}
