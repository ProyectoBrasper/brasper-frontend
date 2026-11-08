import { Component, computed, inject, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { initialsOf } from '../../../../shared/presentation/initials';
import { IamStore } from '../../../application/iam.store';
import { Role, ROLES } from '../../../domain/model/role';
import { User } from '../../../domain/model/user.entity';

/**
 * Administrators: users with their role and status; change role and deactivate.
 */
@Component({
  selector: 'app-user-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList implements OnInit {
  private readonly iamStore = inject(IamStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly displayedColumns = ['username', 'fullName', 'role', 'active', 'actions'];
  readonly roles = ROLES;
  readonly loading = this.iamStore.loading;
  readonly error = this.iamStore.error;
  readonly currentUserId = computed(() => this.iamStore.currentUser()?.id ?? null);

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<User>(this.iamStore.users());
    source.sortingDataAccessor = (user, column) => {
      const value = user[column as keyof User];
      return typeof value === 'string' || typeof value === 'number' ? value : String(value);
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
    this.iamStore.loadUsers();
  }

  readonly initials = initialsOf;

  onChangeRole(id: number, role: Role): void {
    const user = this.iamStore.users().find((u) => u.id === id);
    this.confirm('users.changeRoleTitle', 'users.changeRoleMessage', {
      name: user?.fullName,
      role: this.translate.instant(`role.${role}`),
    }).subscribe(() => this.iamStore.changeUserRole(id, role));
  }

  onDeactivate(id: number): void {
    const user = this.iamStore.users().find((u) => u.id === id);
    this.confirm('users.deactivateTitle', 'users.deactivateMessage', { name: user?.fullName }).subscribe(() =>
      this.iamStore.deactivateUser(id),
    );
  }

  private confirm(titleKey: string, messageKey: string, params: Record<string, unknown>) {
    return this.dialog
      .open(ConfirmDialog, {
        data: {
          title: this.translate.instant(titleKey),
          message: this.translate.instant(messageKey, params),
        },
        width: '440px',
      })
      .afterClosed()
      .pipe(filter((confirmed): confirmed is true => confirmed === true));
  }
}
