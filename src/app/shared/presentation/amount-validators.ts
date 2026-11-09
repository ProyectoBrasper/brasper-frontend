import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/** Backend rule (`@Digits(integer = 12, fraction = 2)`): at most 2 decimals. Empty is left to `required`. */
export const maxTwoDecimals = (control: AbstractControl): ValidationErrors | null => {
  if (control.value === null || control.value === '') {
    return null;
  }
  const cents = Number(control.value) * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6 ? null : { decimals: true };
};

/** A required positive amount that fits the backend `numeric(14,2)`: > 0, at most 12 integer digits, 2 decimals. */
export const AMOUNT_VALIDATORS = [Validators.required, Validators.min(0.01), Validators.max(999_999_999_999.99), maxTwoDecimals];
