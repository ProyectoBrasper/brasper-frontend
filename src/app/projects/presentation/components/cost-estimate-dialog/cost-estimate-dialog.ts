import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { COST_CATEGORIES, CostCategory } from '../../../domain/model/cost-category';
import { CostEstimate } from '../../../domain/model/cost-estimate.entity';

export interface CostEstimateData {
  projectId: number;
  currency: string;
  /** Estimate being edited, or null to add a category. */
  estimate: CostEstimate | null;
  /** Categories that already have an estimate (not offered when adding). */
  usedCategories: CostCategory[];
}

/**
 * Sets the estimated amount of one cost category, in the project's currency.
 * Closes with the {@link CostEstimate} to save or nothing.
 */
@Component({
  selector: 'app-cost-estimate-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.estimate ? 'projects.editEstimate' : 'projects.addEstimate') | translate }}</h2>
    <form [formGroup]="estimateForm" (ngSubmit)="onSave()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'projects.category' | translate }}</mat-label>
          <mat-select formControlName="category">
            @for (category of categories; track category) {
              <mat-option [value]="category">{{ 'costCategory.' + category | translate }}</mat-option>
            }
          </mat-select>
          @if (isInvalidControl(estimateForm, 'category')) {
            <mat-error>{{ errorMessageForControl(estimateForm, 'category') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'projects.estimatedAmount' | translate }}</mat-label>
          <span matTextPrefix>{{ data.currency === 'USD' ? 'US$' : 'S/' }}&nbsp;</span>
          <input matInput class="amount" formControlName="estimatedAmount" type="number" min="0" step="0.01" />
          @if (isInvalidControl(estimateForm, 'estimatedAmount')) {
            <mat-error>{{ errorMessageForControl(estimateForm, 'estimatedAmount') }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit">{{ 'common.save' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    mat-dialog-content { min-width: min(360px, 80vw); }
    input.amount { text-align: right; }
  `,
})
export class CostEstimateDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<CostEstimateDialog, CostEstimate>>(MatDialogRef);
  readonly data = inject<CostEstimateData>(MAT_DIALOG_DATA);

  /** Editing keeps its category; adding offers only the categories without an estimate. */
  readonly categories: CostCategory[] = this.data.estimate
    ? [this.data.estimate.category]
    : COST_CATEGORIES.filter((category) => !this.data.usedCategories.includes(category));

  readonly estimateForm = this.formBuilder.group({
    category: this.formBuilder.control<CostCategory | null>(
      { value: this.data.estimate?.category ?? this.categories[0] ?? null, disabled: !!this.data.estimate },
      Validators.required,
    ),
    estimatedAmount: this.formBuilder.control<number | null>(this.data.estimate?.estimatedAmount ?? null, [
      Validators.required,
      Validators.min(0),
    ]),
  });

  onSave(): void {
    if (this.estimateForm.invalid) {
      this.estimateForm.markAllAsTouched();
      return;
    }
    const { category, estimatedAmount } = this.estimateForm.getRawValue();
    this.dialogRef.close(
      new CostEstimate({
        id: this.data.estimate?.id ?? 0,
        projectId: this.data.projectId,
        category: category!,
        estimatedAmount: Math.round(Number(estimatedAmount) * 100) / 100,
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
