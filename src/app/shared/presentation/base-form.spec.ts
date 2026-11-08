import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { BaseForm } from './base-form';

@Component({ template: '' })
class TestForm extends BaseForm {
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
  });

  invalid = (name: string) => this.isInvalidControl(this.form, name);
  message = (name: string) => this.errorMessageForControl(this.form, name);
}

describe('BaseForm', () => {
  let component: TestForm;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService({ lang: 'es' })] });
    TestBed.inject(TranslateService).setTranslation('es', {
      validation: { required: 'Obligatorio', min: 'Mínimo {{value}}' },
    });
    component = TestBed.createComponent(TestForm).componentInstance;
  });

  it('is not invalid until the control is touched', () => {
    expect(component.invalid('name')).toBe(false);
    component.form.controls.name.markAsTouched();
    expect(component.invalid('name')).toBe(true);
  });

  it('translates the first error with its parameters', () => {
    expect(component.message('name')).toBe('Obligatorio');
    expect(component.message('amount')).toBe('Mínimo 1');
  });

  it('returns an empty message for a valid control', () => {
    component.form.controls.name.setValue('Brasper');
    expect(component.message('name')).toBe('');
  });
});
