import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { RegisterPartnerCommand } from '../../../domain/model/partner.commands';

/**
 * Registers a partner (backend `RegisterPartnerResource`): the name is required and unique (the backend answers 409),
 * the role is optional. A dialog, not a page: the app routes have no partner form and it is only two fields.
 */
@Component({
  selector: 'app-register-partner-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'partners.new' | translate }}</h2>
    <form [formGroup]="partnerForm" (ngSubmit)="onSave()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'partners.fullName' | translate }}</mat-label>
          <input matInput formControlName="fullName" maxlength="200" />
          <mat-hint>{{ 'partners.fullNameHint' | translate }}</mat-hint>
          @if (isInvalidControl(partnerForm, 'fullName')) {
            <mat-error>{{ errorMessageForControl(partnerForm, 'fullName') }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'partners.roleOptional' | translate }}</mat-label>
          <input matInput formControlName="role" maxlength="100" />
          @if (isInvalidControl(partnerForm, 'role')) {
            <mat-error>{{ errorMessageForControl(partnerForm, 'role') }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit">{{ 'partners.new' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    mat-form-field + mat-form-field { margin-top: 8px; }
  `,
})
export class RegisterPartnerDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<RegisterPartnerDialog, RegisterPartnerCommand>>(MatDialogRef);

  readonly partnerForm = this.formBuilder.group({
    fullName: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    role: this.formBuilder.nonNullable.control('', Validators.maxLength(100)),
  });

  onSave(): void {
    // A name of only spaces is blank for the backend (@NotBlank).
    const fullName = this.partnerForm.controls.fullName;
    if (!fullName.value.trim()) {
      fullName.setValue('');
    }
    if (this.partnerForm.invalid) {
      this.partnerForm.markAllAsTouched();
      return;
    }
    const value = this.partnerForm.getRawValue();
    this.dialogRef.close({ fullName: value.fullName.trim(), role: value.role.trim() || null });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
