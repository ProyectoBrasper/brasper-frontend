import { inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

/**
 * Validation helpers for reactive forms. Messages come from the `validation.*` i18n keys.
 */
export abstract class BaseForm {
  protected readonly translate = inject(TranslateService);

  /** True when the control is invalid and the user already interacted with it. */
  protected isInvalidControl(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /** Message for the first error of the control, or an empty string when it is valid. */
  protected errorMessageForControl(form: FormGroup, controlName: string): string {
    const errors = form.get(controlName)?.errors;
    if (!errors) {
      return '';
    }
    const [key, value] = Object.entries(errors)[0];
    return this.translate.instant(`validation.${key}`, this.paramsFor(key, value));
  }

  private paramsFor(key: string, value: unknown): Record<string, unknown> {
    const error = (value ?? {}) as Record<string, unknown>;
    switch (key) {
      case 'min':
        return { value: error['min'] };
      case 'max':
        return { value: error['max'] };
      case 'minlength':
      case 'maxlength':
        return { value: error['requiredLength'] };
      default:
        return {};
    }
  }
}
