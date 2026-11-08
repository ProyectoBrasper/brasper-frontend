import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, Observable } from 'rxjs';

/**
 * Yes / no confirmation for destructive or irreversible actions.
 * Open it with `MatDialog.open(ConfirmDialog, { data: { title, message } })`; it closes with `true`
 * when confirmed and `false` otherwise.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button type="button" (click)="onConfirm()">{{ 'common.confirm' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .message {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ConfirmDialog {
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialog, boolean>>(MatDialogRef);
  readonly data = inject<{ title: string; message: string }>(MAT_DIALOG_DATA);

  /** Opens the dialog and emits once, only if the user confirms. */
  static confirm(dialog: MatDialog, data: { title: string; message: string }): Observable<true> {
    return dialog
      .open<ConfirmDialog, { title: string; message: string }, boolean>(ConfirmDialog, { data, width: '440px' })
      .afterClosed()
      .pipe(filter((confirmed): confirmed is true => confirmed === true));
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
