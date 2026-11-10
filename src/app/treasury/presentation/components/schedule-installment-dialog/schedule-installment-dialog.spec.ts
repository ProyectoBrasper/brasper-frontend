import { FormControl } from '@angular/forms';
import { INTEREST_VALIDATORS } from './schedule-installment-dialog';

const errorsOf = (value: number | null) => new FormControl<number | null>(value, INTEREST_VALIDATORS).errors;

describe('installment interest (backend: >= 0, 2 decimals)', () => {
  it('accepts zero, like the contractor loan of DATOS.md', () => {
    expect(errorsOf(0)).toBeNull();
  });

  it('accepts an amount with 2 decimals', () => {
    expect(errorsOf(2000)).toBeNull();
    expect(errorsOf(250.5)).toBeNull();
  });

  it('rejects a negative amount, a third decimal and an empty field', () => {
    expect(errorsOf(-1)).toHaveProperty('min');
    expect(errorsOf(1.005)).toHaveProperty('decimals');
    expect(errorsOf(null)).toHaveProperty('required');
  });
});
