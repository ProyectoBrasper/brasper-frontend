import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { CostEstimate } from '../../../domain/model/cost-estimate.entity';

/**
 * Cost estimates by category with their total (= the project's estimated direct cost).
 */
@Component({
  selector: 'app-cost-estimate-table',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe, MoneyPipe],
  template: `
    <table mat-table class="data-table" [dataSource]="estimates()">
      <ng-container matColumnDef="category">
        <th mat-header-cell *matHeaderCellDef>{{ 'projects.category' | translate }}</th>
        <td mat-cell *matCellDef="let estimate">{{ 'costCategory.' + estimate.category | translate }}</td>
        <td mat-footer-cell *matFooterCellDef>{{ 'common.total' | translate }}</td>
      </ng-container>
      <ng-container matColumnDef="estimatedAmount">
        <th mat-header-cell *matHeaderCellDef class="amount">{{ 'projects.estimatedAmount' | translate }}</th>
        <td mat-cell *matCellDef="let estimate" class="amount">{{ estimate.estimatedAmount | money: currency() }}</td>
        <td mat-footer-cell *matFooterCellDef class="amount">{{ total() | money: currency() }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef class="edit-col">
          <span class="cdk-visually-hidden">{{ 'common.actions' | translate }}</span>
        </th>
        <td mat-cell *matCellDef="let estimate" class="edit-col">
          <button
            mat-icon-button
            type="button"
            (click)="edit.emit(estimate)"
            [matTooltip]="'common.edit' | translate"
            [attr.aria-label]="'common.editItem' | translate: { name: ('costCategory.' + estimate.category | translate) }"
          >
            <mat-icon>edit</mat-icon>
          </button>
        </td>
        <td mat-footer-cell *matFooterCellDef class="edit-col"></td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns()"></tr>
      <tr mat-row *matRowDef="let estimate; columns: columns()"></tr>
      <tr mat-footer-row *matFooterRowDef="columns()" [class.hidden]="estimates().length === 0"></tr>
      <tr class="mat-mdc-row empty-row" *matNoDataRow>
        <td class="mat-mdc-cell" [attr.colspan]="columns().length">{{ 'projects.noEstimates' | translate }}</td>
      </tr>
    </table>
  `,
  styles: `
    table { --mat-table-row-item-container-height: 44px; }
    td.mat-mdc-footer-cell { font-weight: 700; border-top: 1px solid var(--mat-sys-outline-variant); }
    .edit-col { width: 56px; text-align: right; }
    .hidden { display: none; }
  `,
})
export class CostEstimateTable {
  readonly estimates = input.required<CostEstimate[]>();
  readonly currency = input<string>('PEN');
  /** Whether the edit buttons are shown (open project and a user who can write). */
  readonly canEdit = input<boolean>(false);
  readonly edit = output<CostEstimate>();

  readonly columns = computed(() =>
    this.canEdit() ? ['category', 'estimatedAmount', 'actions'] : ['category', 'estimatedAmount'],
  );
  readonly total = computed(
    () => Math.round(this.estimates().reduce((sum, estimate) => sum + estimate.estimatedAmount, 0) * 100) / 100,
  );
}
