import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { initialsOf } from '../../../../shared/presentation/initials';
import { IamStore } from '../../../application/iam.store';
import { PasswordDialog, PasswordDialogData } from '../password-dialog/password-dialog';

/**
 * Signed-in user block. `toolbar`: avatar + name, opening a menu to change the password or sign out. `sidebar`: card
 * with role chip + sign out.
 * Without a session it offers the sign-in button.
 */
@Component({
  selector: 'app-authentication-section',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslatePipe],
  templateUrl: './authentication-section.html',
  styleUrl: './authentication-section.css',
})
export class AuthenticationSection {
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly mode = input<'toolbar' | 'sidebar'>('toolbar');

  readonly isSignedIn = this.iamStore.isSignedIn;
  readonly currentUsername = this.iamStore.currentUsername;
  readonly fullName = computed(() => this.iamStore.currentUser()?.fullName ?? '');
  readonly role = this.iamStore.currentRole;
  readonly initials = computed(() => initialsOf(this.fullName()));

  onSignIn(): void {
    void this.router.navigate(['/sign-in']);
  }

  onChangePassword(): void {
    this.dialog.open<PasswordDialog, PasswordDialogData>(PasswordDialog, { data: { user: null }, width: '480px' });
  }

  onSignOut(): void {
    this.iamStore.signOut();
  }
}
