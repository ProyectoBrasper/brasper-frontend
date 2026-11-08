import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Backend rule (`Username`): 3 to 50 lowercase letters, digits, dot, hyphen or underscore. */
export const usernameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^[a-z0-9._-]{3,50}$/.test(control.value) ? null : { username: true };

/** Backend rule (`UserCommandService`): 8 to 72 characters with at least one letter and one digit. */
export const passwordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(control.value) ? null : { password: true };
