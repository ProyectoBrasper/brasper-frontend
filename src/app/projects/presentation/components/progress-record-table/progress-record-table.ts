import { PercentPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProgressRecord } from '../../../domain/model/progress-record.entity';

/**
 * Monthly progress of a project with the accumulated total.
 */
@Component({
  selector: 'app-progress-record-table',
  imports: [MatTableModule, PercentPipe, TranslatePipe],
  template: `
    <table mat-table class="data-table" [dataSource]="records()">
      <ng-container matColumnDef="period">
        <th mat-header-cell *matHeaderCellDef>{{ 'projects.period' | translate }}</th>
        <td mat-cell *matCellDef="let record">{{ periodLabel(record) }}</td>
        <td mat-footer-cell *matFooterCellDef>{{ 'projects.accumulated' | translate }}</td>
      </ng-container>
      <ng-container matColumnDef="percentage">
        <th mat-header-cell *matHeaderCellDef class="amount">{{ 'projects.monthProgress' | translate }}</th>
        <td mat-cell *matCellDef="let record" class="amount">{{ record.percentage | percent: '1.0-2' }}</td>
        <td mat-footer-cell *matFooterCellDef class="amount">{{ accumulated() | percent: '1.0-2' }}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let record; columns: columns"></tr>
      <tr mat-footer-row *matFooterRowDef="columns" [class.hidden]="records().length === 0"></tr>
      <tr class="mat-mdc-row empty-row" *matNoDataRow>
        <td class="mat-mdc-cell" [attr.colspan]="columns.length">{{ 'projects.noProgress' | translate }}</td>
      </tr>
    </table>
  `,
  styles: `
    table { --mat-table-row-item-container-height: 44px; }
    td.mat-mdc-footer-cell { font-weight: 700; border-top: 1px solid var(--mat-sys-outline-variant); }
    .hidden { display: none; }
  `,
})
export class ProgressRecordTable {
  private readonly translate = inject(TranslateService);

  readonly records = input.required<ProgressRecord[]>();
  readonly columns = ['period', 'percentage'];
  readonly accumulated = computed(
    () => Math.round(this.records().reduce((sum, record) => sum + record.percentage, 0) * 10000) / 10000,
  );

  periodLabel(record: ProgressRecord): string {
    return record.period.label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  }
}
