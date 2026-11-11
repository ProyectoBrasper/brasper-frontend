import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Money } from '../../../../shared/domain/model/money';
import { Period } from '../../../../shared/domain/model/period';
import { ConfirmDialog } from '../../../../shared/presentation/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { AccountingStore } from '../../../application/accounting.store';
import { DisposeFixedAssetCommand } from '../../../domain/model/fixed-asset.commands';
import { FixedAsset } from '../../../domain/model/fixed-asset.entity';
import {
  depreciationEntry,
  isCurrentMonth,
  isFutureMonth,
  lastDayOf,
  monthlyCharge,
} from '../../../domain/services/fixed-asset-figures';
import {
  DisposeFixedAssetData,
  DisposeFixedAssetDialog,
} from '../../components/dispose-fixed-asset-dialog/dispose-fixed-asset-dialog';

/**
 * The fixed assets (`/accounting/fixed-assets`) with their depreciation as of today, the depreciation of a month and
 * the disposal of an asset. Admin and accounting write; management only reads. A disposed asset was written off, so
 * it shows no book value.
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
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
    StatusChip,
  ],
  templateUrl: './fixed-asset-list.html',
  styleUrl: './fixed-asset-list.css',
})
export class FixedAssetList implements OnInit {
  private readonly accountingStore = inject(AccountingStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly canWrite = this.accountingStore.canWrite;
  readonly displayedColumns = computed(() => [
    'description',
    'acquiredOn',
    'taxableBase',
    'total',
    'usefulLifeMonths',
    'monthlyDepreciation',
    'bookValue',
    'status',
    ...(this.canWrite() ? ['actions'] : []),
  ]);

  /** The month of the depreciation card. */
  readonly period = signal(this.currentPeriod());
  readonly filter = signal<'IN_USE' | 'ALL'>('IN_USE');
  readonly inUseCount = computed(() => this.accountingStore.fixedAssets().filter((asset) => !asset.disposed).length);
  readonly totalCount = computed(() => this.accountingStore.fixedAssets().length);

  readonly charge = computed(() => monthlyCharge(this.accountingStore.fixedAssets(), this.period()));
  private readonly entry = computed(() => depreciationEntry(this.accountingStore.journalEntries()));
  readonly posted = computed(() => this.entry() !== undefined);
  readonly reversed = computed(() => this.entry()?.reversed === true);
  readonly future = computed(() => isFutureMonth(this.period()));
  readonly monthOpen = computed(() => isCurrentMonth(this.period()) && !this.posted() && this.charge().total > 0);
  /** Posting needs something due in a month that started and was not posted (the backend answers 409 otherwise). */
  readonly canPost = computed(() => !this.loading() && !this.posted() && !this.future() && this.charge().total > 0);

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const showAll = this.filter() === 'ALL';
    const assets = this.accountingStore.fixedAssets().filter((asset) => showAll || !asset.disposed);
    const source = new MatTableDataSource<FixedAsset>(assets);
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

  constructor() {
    // The month's entries tell whether its depreciation was already posted.
    effect(() => {
      const period = this.period();
      untracked(() => this.accountingStore.loadJournalEntries(period));
    });
  }

  ngOnInit(): void {
    this.accountingStore.clearError();
    this.accountingStore.loadFixedAssets();
  }

  onRunDepreciation(): void {
    const period = this.period();
    const locale = this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE';
    ConfirmDialog.confirm(this.dialog, {
      title: this.translate.instant('fixedAssets.confirmTitle', { period: period.label(locale) }),
      message: this.translate.instant('fixedAssets.confirmMessage', {
        date: lastDayOf(period).split('-').reverse().join('/'),
        amount: new Money(this.charge().total).format(),
      }),
    }).subscribe(() => this.accountingStore.runMonthlyDepreciation(period));
  }

  onDispose(asset: FixedAsset): void {
    this.dialog
      .open<DisposeFixedAssetDialog, DisposeFixedAssetData, DisposeFixedAssetCommand>(DisposeFixedAssetDialog, {
        data: { asset },
        width: '520px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.accountingStore.disposeFixedAsset(asset.id, command);
        }
      });
  }

  private currentPeriod(): Period {
    const today = new Date();
    return new Period(today.getFullYear(), today.getMonth() + 1);
  }
}
