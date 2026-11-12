import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { AccountingStore } from '../../../application/accounting.store';
import { CreateLedgerAccountCommand } from '../../../domain/model/ledger-account.commands';
import { LEDGER_ACCOUNT_TYPES, LedgerAccount, LedgerAccountType } from '../../../domain/model/ledger-account.entity';
import {
  CreateLedgerAccountData,
  CreateLedgerAccountDialog,
} from '../../components/create-ledger-account-dialog/create-ledger-account-dialog';

/**
 * The chart of accounts (`/accounting/ledger-accounts`) by code, with a filter by type. Admin and accounting add
 * accounts; management only reads. The backend cannot deactivate an account yet, so the status has no action.
 */
@Component({
  selector: 'app-ledger-account-list',
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './ledger-account-list.html',
  styleUrl: './ledger-account-list.css',
})
export class LedgerAccountList implements OnInit {
  private readonly accountingStore = inject(AccountingStore);
  private readonly dialog = inject(MatDialog);

  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly canWrite = this.accountingStore.canWrite;
  readonly types: readonly (LedgerAccountType | null)[] = [null, ...LEDGER_ACCOUNT_TYPES];
  readonly typeFilter = signal<LedgerAccountType | null>(null);
  readonly displayedColumns = ['code', 'name', 'type', 'active'];

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const type = this.typeFilter();
    const accounts = this.accountingStore.ledgerAccounts().filter((account) => type === null || account.type === type);
    const source = new MatTableDataSource<LedgerAccount>(accounts);
    source.sortingDataAccessor = (account, column) => {
      switch (column) {
        case 'type':
          return LEDGER_ACCOUNT_TYPES.indexOf(account.type);
        case 'active':
          return account.active ? 0 : 1;
        case 'name':
          return account.name.toLowerCase();
        default:
          return account.code;
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
    this.accountingStore.clearError();
    this.accountingStore.loadLedgerAccounts();
  }

  count(type: LedgerAccountType | null): number {
    return this.accountingStore.countLedgerAccountsByType(type);
  }

  onCreate(): void {
    this.dialog
      .open<CreateLedgerAccountDialog, CreateLedgerAccountData, CreateLedgerAccountCommand>(CreateLedgerAccountDialog, {
        data: { codesInUse: this.accountingStore.ledgerAccounts().map((account) => account.code) },
        width: '480px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.accountingStore.createLedgerAccount(command);
        }
      });
  }
}
