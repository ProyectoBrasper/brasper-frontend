import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { IamStore } from '../../../application/iam.store';
import { Role, ROLES } from '../../../domain/model/role';
import { SignUpCommand } from '../../../domain/model/sign-up.command';
import { passwordValidator, usernameValidator } from '../../credential-validators';

/**
 * "New user" form for administrators (the backend only lets ADMIN register users).
 */
@Component({
  selector: 'app-sign-up-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './sign-up-form.html',
})
export class SignUpForm extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly iamStore = inject(IamStore);

  readonly roles: readonly Role[] = ROLES;
  readonly loading = this.iamStore.loading;
  readonly error = this.iamStore.error;
  readonly hidePassword = signal(true);

  readonly signUpForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    username: ['', [Validators.required, usernameValidator]],
    password: ['', [Validators.required, passwordValidator]],
    role: [Role.ROLE_ENGINEER, Validators.required],
  });

  onSubmit(): void {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }
    const { fullName, username, password, role } = this.signUpForm.getRawValue();
    this.iamStore.signUp(
      new SignUpCommand({ fullName: fullName.trim(), username: username.trim(), password, role }),
      ['/users'],
    );
  }
}
