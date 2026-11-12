import { FormControl } from '@angular/forms';
import { toFraction } from '../../../../shared/domain/model/percentage';
import { MAX_RATE_PERCENT, RATE_VALIDATORS } from './loan-form';

const errorsOf = (value: number | null) => new FormControl<number | null>(value, RATE_VALIDATORS).errors;

describe('loan rate (a yearly percentage, 0 to 100 with 2 decimals)', () => {
  it('accepts 0 %: a loan without interest, like the contractor loan of DATOS.md', () => {
    expect(errorsOf(0)).toBeNull();
  });

  it('accepts 12 % and 12.5 %', () => {
    expect(errorsOf(12)).toBeNull();
    expect(errorsOf(12.5)).toBeNull();
  });

  it('accepts the ceiling and rejects anything above it', () => {
    expect(errorsOf(MAX_RATE_PERCENT)).toBeNull();
    expect(errorsOf(100.01)).toHaveProperty('max');
    expect(errorsOf(1200)).toHaveProperty('max');
  });

  it('rejects a negative rate, a third decimal and an empty field', () => {
    expect(errorsOf(-1)).toHaveProperty('min');
    expect(errorsOf(12.345)).toHaveProperty('decimals');
    expect(errorsOf(null)).toHaveProperty('required');
  });

  it('is sent to the API as a fraction with the backend precision (12 % → 0.12, 12.5 % → 0.125)', () => {
    expect(toFraction(12)).toBe(0.12);
    expect(toFraction(12.5)).toBe(0.125);
    expect(toFraction(0)).toBe(0);
  });
});
