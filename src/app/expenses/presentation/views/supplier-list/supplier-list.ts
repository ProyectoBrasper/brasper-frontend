import { Component, computed, inject, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { initialsOf } from '../../../../shared/presentation/initials';
import { ExpensesStore } from '../../../application/expenses.store';
import { Supplier } from '../../../domain/model/supplier.entity';

/** Suppliers of the company's expenses. Any signed-in user reads; admin, accounting and engineers write. */
@Component({
  selector: 'app-supplier-list',
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './supplier-list.html',
  styles: `
    .tag {
      padding: 1px 8px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--brasper-radius-sm);
      background: var(--mat-sys-surface-container);
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class SupplierList implements OnInit {
  private readonly expensesStore = inject(ExpensesStore);
  private readonly router = inject(Router);

  readonly loading = this.expensesStore.loading;
  readonly error = this.expensesStore.error;
  readonly canWrite = this.expensesStore.canWrite;
  readonly displayedColumns = computed(() => {
    const columns = ['businessName', 'ruc', 'type', 'phone'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<Supplier>(this.expensesStore.suppliers());
    source.sortingDataAccessor = (supplier, column) => String(supplier[column as keyof Supplier] ?? '').toLowerCase();
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
    this.expensesStore.loadSuppliers();
  }

  onEdit(id: number): void {
    if (this.canWrite()) {
      void this.router.navigate(['/expenses/suppliers', id, 'edit']);
    }
  }

  onAdd(): void {
    void this.router.navigate(['/expenses/suppliers/new']);
  }
}
