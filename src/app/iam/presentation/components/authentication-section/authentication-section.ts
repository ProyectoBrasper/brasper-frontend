import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IamStore } from '../../../application/iam.store';

/**
 * Signed-in user block. `toolbar`: avatar + name. `sidebar`: card with role chip + sign out.
 * Without a session it offers the sign-in button.
 */
@Component({
  selector: 'app-authentication-section',
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './authentication-section.html',
  styleUrl: './authentication-section.css',
})
export class AuthenticationSection {
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  readonly mode = input<'toolbar' | 'sidebar'>('toolbar');

  readonly isSignedIn = this.iamStore.isSignedIn;
  readonly currentUsername = this.iamStore.currentUsername;
  readonly fullName = computed(() => this.iamStore.currentUser()?.fullName ?? '');
  readonly role = this.iamStore.currentRole;
  readonly initials = computed(() =>
    this.fullName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  onSignIn(): void {
    void this.router.navigate(['/sign-in']);
  }

  onSignOut(): void {
    this.iamStore.signOut();
  }
}
