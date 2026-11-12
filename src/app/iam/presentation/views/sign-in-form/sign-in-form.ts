import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';
import { IamStore } from '../../../application/iam.store';
import { SignInCommand } from '../../../domain/model/sign-in.command';

/** Where users land after signing in: the root redirects by role. */
export const HOME_ROUTE = ['/'];

/**
 * Split-screen sign-in: brand panel + username / password form.
 * Users are created by an administrator, so there is no self-registration link.
 */
@Component({
  selector: 'app-sign-in-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    LanguageSwitcher,
  ],
  templateUrl: './sign-in-form.html',
  styleUrl: './sign-in-form.css',
})
export class SignInForm extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly iamStore = inject(IamStore);

  readonly loading = this.iamStore.loading;
  readonly error = this.iamStore.error;
  readonly hidePassword = signal(true);
  readonly year = new Date().getFullYear();

  readonly signInForm = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }
    const { username, password } = this.signInForm.getRawValue();
    this.iamStore.signIn(new SignInCommand({ username: username.trim(), password }), HOME_ROUTE);
  }
}
