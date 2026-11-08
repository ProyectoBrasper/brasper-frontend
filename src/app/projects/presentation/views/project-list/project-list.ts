import { PercentPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { initialsOf } from '../../../../shared/presentation/initials';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ProjectsStore } from '../../../application/projects.store';
import { Project } from '../../../domain/model/project.entity';
import { PROJECT_STATUSES, ProjectStatus } from '../../../domain/model/project-status';

/**
 * Project portfolio with a status filter, progress and the start / cancel actions.
 */
@Component({
  selector: 'app-project-list',
  imports: [
    PercentPipe,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.css',
})
export class ProjectList implements OnInit {
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly loading = this.projectsStore.loading;
  readonly error = this.projectsStore.error;
  readonly canWrite = this.projectsStore.canWrite;
  readonly statuses: readonly (ProjectStatus | null)[] = [null, ...PROJECT_STATUSES];
  readonly statusFilter = signal<ProjectStatus | null>(null);
  readonly displayedColumns = ['code', 'name', 'client', 'budget', 'accumulatedProgress', 'status', 'actions'];

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const status = this.statusFilter();
    const projects = this.projectsStore.projects().filter((p) => status === null || p.status === status);
    const source = new MatTableDataSource<Project>(projects);
    source.sortingDataAccessor = (project, column) => {
      switch (column) {
        case 'client':
          return this.getClientName(project.clientId).toLowerCase();
        case 'budget':
        case 'accumulatedProgress':
          return project[column];
        default:
          return String(project[column as keyof Project] ?? '').toLowerCase();
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

  readonly initials = initialsOf;

  ngOnInit(): void {
    this.projectsStore.loadProjects();
    this.projectsStore.loadClients();
  }

  count(status: ProjectStatus | null): number {
    return this.projectsStore.countByStatus(status);
  }

  getClientName(clientId: number): string {
    return this.projectsStore.getClientById(clientId)?.businessName ?? '';
  }

  /** Edit / start / cancel are shown only when the user can write and the status allows them. */
  canChange(project: Project): boolean {
    return this.canWrite() && project.isOpen();
  }

  onView(id: number): void {
    void this.router.navigate(['/projects', id]);
  }

  onEdit(id: number): void {
    void this.router.navigate(['/projects', id, 'edit']);
  }

  onAdd(): void {
    void this.router.navigate(['/projects/new']);
  }

  onStart(project: Project): void {
    this.confirm('projects.startTitle', 'projects.startMessage', project).subscribe(() =>
      this.projectsStore.startProject(project.id),
    );
  }

  onCancelProject(project: Project): void {
    this.confirm('projects.cancelTitle', 'projects.cancelMessage', project).subscribe(() =>
      this.projectsStore.cancelProject(project.id),
    );
  }

  private confirm(titleKey: string, messageKey: string, project: Project) {
    return ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant(titleKey),
      message: this.translate.instant(messageKey, { code: project.code, name: project.name }),
    });
  }
}
