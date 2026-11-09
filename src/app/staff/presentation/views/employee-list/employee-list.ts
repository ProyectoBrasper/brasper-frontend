import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { initialsOf } from '../../../../shared/presentation/initials';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { StaffStore } from '../../../application/staff.store';
import { Employee } from '../../../domain/model/employee.entity';
import { TerminateEmployeeDialog } from '../../components/terminate-employee-dialog/terminate-employee-dialog';

/**
 * Payroll (`/staff/employees`): admin, accounting and management read; admin and accounting hire, edit
 * (position and salary) and terminate. Terminated employees stay listed, greyed out, with their date.
 */
@Component({
  selector: 'app-employee-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './employee-list.html',
  styles: `
    table { min-width: 960px; }
    tr.inactive td { color: var(--mat-sys-outline); }
    .terminated-on { margin-left: 6px; font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }
    .actions-col { width: 112px; }
  `,
})
export class EmployeeList implements OnInit {
  private readonly staffStore = inject(StaffStore);
  private readonly dialog = inject(MatDialog);

  readonly loading = this.staffStore.loading;
  readonly error = this.staffStore.error;
  readonly canWrite = this.staffStore.canWrite;
  readonly displayedColumns = computed(() => {
    const columns = ['fullName', 'dni', 'position', 'monthlySalary', 'hiredOn', 'status'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<Employee>(this.staffStore.employees());
    source.sortingDataAccessor = (employee, column) => {
      switch (column) {
        case 'monthlySalary':
          return employee.monthlySalary;
        case 'status':
          return employee.active ? 0 : 1;
        default:
          return String(employee[column as keyof Employee] ?? '').toLowerCase();
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
    this.staffStore.loadEmployees();
  }

  onTerminate(employee: Employee): void {
    this.dialog
      .open<TerminateEmployeeDialog, Employee, string>(TerminateEmployeeDialog, { data: employee, width: '460px' })
      .afterClosed()
      .subscribe((terminatedOn) => {
        if (terminatedOn) {
          this.staffStore.terminateEmployee(employee.id, terminatedOn);
        }
      });
  }
}
