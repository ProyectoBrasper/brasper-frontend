import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { CreateLedgerAccountCommand } from '../../../domain/model/ledger-account.commands';
import {
  ACCOUNT_CODE_PATTERN,
  LEDGER_ACCOUNT_TYPES,
  LedgerAccountType,
} from '../../../domain/model/ledger-account.entity';
import { typeForCode } from '../../../domain/services/ledger-account-figures';

export interface CreateLedgerAccountData {
  /** Codes already in the chart, to warn before the backend answers 409. */
  codesInUse: string[];
}

/** A code already in the chart (the backend would answer 409). */
export function codeNotInUse(codesInUse: readonly string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    codesInUse.includes(String(control.value ?? '').trim()) ? { codeInUse: true } : null;
}

/**
 * Adds an account to the chart. The code has 2 to 10 digits and starts with 1 to 9 (backend `AccountCode`) and is
 * unique; the type is proposed from its first digit until the user picks one, since there are exceptions. Closes
 * with the command.
 */
@Component({
  selector: 'app-create-ledger-account-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'ledgerAccounts.new' | translate }}</h2>
    <form [formGroup]="accountForm" (ngSubmit)="onSave()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ledgerAccounts.code' | translate }}</mat-label>
          <input matInput class="mono" formControlName="code" maxlength="10" inputmode="numeric" />
          <mat-hint>{{ 'ledgerAccounts.codeHint' | translate }}</mat-hint>
          @if (isInvalidControl(accountForm, 'code')) {
            <mat-error>{{ codeError() }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'ledgerAccounts.name' | translate }}</mat-label>
          <input matInput formControlName="name" maxlength="200" />
          @if (isInvalidControl(accountForm, 'name')) {
            <mat-error>{{ errorMessageForControl(accountForm, 'name') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'ledgerAccounts.type' | translate }}</mat-label>
          <mat-select formControlName="type">
            @for (type of types; track type) {
              <mat-option [value]="type">{{ 'ledgerAccountType.' + type | translate }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ 'ledgerAccounts.typeHint' | translate }}</mat-hint>
          @if (isInvalidControl(accountForm, 'type')) {
            <mat-error>{{ errorMessageForControl(accountForm, 'type') }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit">{{ 'ledgerAccounts.new' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    mat-form-field + mat-form-field { margin-top: 8px; }
  `,
})
export class CreateLedgerAccountDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<CreateLedgerAccountDialog, CreateLedgerAccountCommand>>(MatDialogRef);
  readonly data = inject<CreateLedgerAccountData>(MAT_DIALOG_DATA);

  readonly types = LEDGER_ACCOUNT_TYPES;

  readonly accountForm = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(ACCOUNT_CODE_PATTERN),
      codeNotInUse(this.data.codesInUse),
    ]),
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    type: this.formBuilder.control<LedgerAccountType | null>(null, Validators.required),
  });

  constructor() {
    super();
    // Propose the type from the code until the user chooses one by hand.
    this.accountForm.controls.code.valueChanges.subscribe((code) => {
      const type = this.accountForm.controls.type;
      if (!type.dirty) {
        type.setValue(typeForCode(code));
      }
    });
  }

  codeError(): string {
    const code = this.accountForm.controls.code;
    if (code.hasError('pattern')) {
      return this.translate.instant('ledgerAccounts.codePattern');
    }
    if (code.hasError('codeInUse')) {
      return this.translate.instant('ledgerAccounts.codeInUse');
    }
    return this.errorMessageForControl(this.accountForm, 'code');
  }

  onSave(): void {
    // A name of only spaces is blank for the backend (@NotBlank).
    const name = this.accountForm.controls.name;
    if (!name.value.trim()) {
      name.setValue('');
    }
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const value = this.accountForm.getRawValue();
    this.dialogRef.close({ code: value.code.trim(), name: value.name.trim(), type: value.type! });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
