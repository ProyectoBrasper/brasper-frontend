import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { IamStore } from '../../../application/iam.store';
import { User } from '../../../domain/model/user.entity';
import { matchesNewPassword, passwordValidator } from '../../credential-validators';

export interface PasswordDialogData {
  /** The user an administrator resets; null to change one's own password, which asks for the current one. */
  user: User | null;
}

/**
 * Changes one's own password or resets another user's. It stays open on an error, so the typed values are kept, and
 * confirms before closing.
 */
@Component({
  selector: 'app-password-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './password-dialog.html',
  styleUrl: './password-dialog.css',
})
export class PasswordDialog extends BaseForm implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly iamStore = inject(IamStore);
  private readonly dialogRef = inject<MatDialogRef<PasswordDialog>>(MatDialogRef);
  private readonly data = inject<PasswordDialogData>(MAT_DIALOG_DATA);

  readonly user = this.data.user;
  readonly loading = this.iamStore.loading;
  readonly error = this.iamStore.error;
  readonly hidden = signal(true);
  readonly done = signal(false);

  readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: ['', this.user ? [] : [Validators.required]],
    newPassword: ['', [Validators.required, passwordValidator]],
    confirmation: ['', [Validators.required, matchesNewPassword]],
  });

  constructor() {
    super();
    this.iamStore.clearError();
    // The confirmation has to be checked again when the password it must match changes.
    this.passwordForm.controls.newPassword.valueChanges.subscribe(() =>
      this.passwordForm.controls.confirmation.updateValueAndValidity(),
    );
  }

  onSave(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    const onDone = () => this.done.set(true);
    if (this.user) {
      this.iamStore.resetUserPassword(this.user.id, newPassword, onDone);
    } else {
      this.iamStore.changePassword({ currentPassword, newPassword }, onDone);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  /** An error from here must not stay on the page behind the dialog. */
  ngOnDestroy(): void {
    this.iamStore.clearError();
  }
}
