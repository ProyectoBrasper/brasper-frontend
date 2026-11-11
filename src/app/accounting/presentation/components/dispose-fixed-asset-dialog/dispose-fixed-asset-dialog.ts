import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { DisposeFixedAssetCommand } from '../../../domain/model/fixed-asset.commands';
import { FixedAsset } from '../../../domain/model/fixed-asset.entity';
import { isBackdatedDisposal, previewDisposal } from '../../../domain/services/fixed-asset-figures';

export interface DisposeFixedAssetData {
  asset: FixedAsset;
}

/** Today, or the acquisition date of an asset dated later (a disposal never goes before it). */
export function defaultDisposalDate(acquiredOn: string, today: Date = new Date()): Date {
  const date = fromIsoDate(acquiredOn);
  return date && date > today ? date : today;
}

/**
 * Asks for the date an asset leaves the company and previews the entry the backend will post: the accumulated
 * depreciation and the loss against the cost. It records no sale and cannot be undone. Closes with the command.
 */
@Component({
  selector: 'app-dispose-fixed-asset-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'fixedAssets.disposeTitle' | translate }}</h2>
    <form [formGroup]="disposalForm" (ngSubmit)="onSave()" novalidate>
      <mat-dialog-content>
        <p class="summary">
          {{ asset.description }}<br />
          {{ asset.acquiredOn | date: 'dd/MM/yyyy' }} · {{ asset.taxableBase | money: asset.currency }}
        </p>

        <p class="notice" role="note">
          <mat-icon>warning</mat-icon>
          <span>{{ 'fixedAssets.disposeNotice' | translate }}</span>
        </p>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'fixedAssets.disposedOn' | translate }}</mat-label>
          <input matInput formControlName="disposedOn" [matDatepicker]="picker" [min]="minDate" placeholder="dd/mm/aaaa" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
          @if (isInvalidControl(disposalForm, 'disposedOn')) {
            <mat-error>
              {{
                disposalForm.controls.disposedOn.hasError('matDatepickerMin')
                  ? ('fixedAssets.disposedBeforeAcquisition' | translate)
                  : errorMessageForControl(disposalForm, 'disposedOn')
              }}
            </mat-error>
          }
        </mat-form-field>

        @if (backdated()) {
          <p class="notice" role="note">
            <mat-icon>history</mat-icon>
            <span>{{ 'fixedAssets.backdatedNotice' | translate }}</span>
          </p>
        }

        @if (preview(); as entry) {
          <h3>{{ 'fixedAssets.entryPreview' | translate }}</h3>
          <dl class="entry">
            @if (entry.accumulated > 0) {
              <dt>{{ 'fixedAssets.debitAccumulated' | translate }}</dt>
              <dd>{{ entry.accumulated | money: asset.currency }}</dd>
            }
            @if (entry.loss > 0) {
              <dt>{{ 'fixedAssets.debitLoss' | translate }}</dt>
              <dd>{{ entry.loss | money: asset.currency }}</dd>
            }
            <dt>{{ 'fixedAssets.creditCost' | translate }}</dt>
            <dd>{{ entry.cost | money: asset.currency }}</dd>
          </dl>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit" class="danger">{{ 'fixedAssets.dispose' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    .summary { margin: 0 0 12px; font-weight: 500; }
    .notice {
      display: flex; align-items: flex-start; gap: 8px; margin: 0 0 16px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning); font: var(--mat-sys-body-medium);
    }
    h3 { margin: 0 0 8px; font: var(--mat-sys-title-small); }
    .entry { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; margin: 0; }
    .entry dt { color: var(--mat-sys-on-surface-variant); }
    .entry dd { margin: 0; text-align: right; font-weight: 600; white-space: nowrap; }
    .danger { --mat-button-filled-container-color: var(--mat-sys-error); --mat-button-filled-label-text-color: var(--mat-sys-on-error); }
  `,
})
export class DisposeFixedAssetDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<DisposeFixedAssetDialog, DisposeFixedAssetCommand>>(MatDialogRef);
  private readonly data = inject<DisposeFixedAssetData>(MAT_DIALOG_DATA);

  readonly asset = this.data.asset;
  readonly minDate = fromIsoDate(this.asset.acquiredOn);

  readonly disposalForm = this.formBuilder.group({
    disposedOn: this.formBuilder.control<Date | null>(defaultDisposalDate(this.asset.acquiredOn), Validators.required),
  });

  private readonly value = toSignal(this.disposalForm.valueChanges, { initialValue: this.disposalForm.getRawValue() });
  private readonly date = computed(() => {
    const date = this.value().disposedOn;
    return date instanceof Date && !Number.isNaN(date.getTime()) ? toIsoDate(date) : null;
  });

  readonly preview = computed(() => {
    const date = this.date();
    return date ? previewDisposal(this.asset, date) : null;
  });
  readonly backdated = computed(() => {
    const date = this.date();
    return date !== null && isBackdatedDisposal(date);
  });

  onSave(): void {
    if (this.disposalForm.invalid) {
      this.disposalForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ disposedOn: toIsoDate(this.disposalForm.getRawValue().disposedOn!) });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
