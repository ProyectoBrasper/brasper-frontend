import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { AccountingStore } from '../../../application/accounting.store';
import { FixedAsset } from '../../../domain/model/fixed-asset.entity';

/**
 * The fixed assets (`/accounting/fixed-assets`) with their depreciation as of today. Admin and accounting register
 * them; management only reads. A disposed asset was written off, so it shows no book value.
 */
@Component({
  selector: 'app-fixed-asset-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './fixed-asset-list.html',
  styleUrl: './fixed-asset-list.css',
})
export class FixedAssetList implements OnInit {
  private readonly accountingStore = inject(AccountingStore);

  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly canWrite = this.accountingStore.canWrite;
  readonly displayedColumns = [
    'description',
    'acquiredOn',
    'taxableBase',
    'total',
    'usefulLifeMonths',
    'monthlyDepreciation',
    'bookValue',
    'status',
  ];

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<FixedAsset>(this.accountingStore.fixedAssets());
    source.sortingDataAccessor = (asset, column) => {
      switch (column) {
        case 'description':
          return asset.description.toLowerCase();
        case 'acquiredOn':
          return asset.acquiredOn;
        case 'taxableBase':
          return asset.taxableBase;
        case 'total':
          return asset.total;
        case 'usefulLifeMonths':
          return asset.usefulLifeMonths;
        case 'monthlyDepreciation':
          return asset.monthlyDepreciation;
        case 'bookValue':
          return asset.disposed ? -1 : asset.bookValue;
        default:
          return asset.disposed ? 1 : 0;
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
    this.accountingStore.loadFixedAssets();
  }
}
