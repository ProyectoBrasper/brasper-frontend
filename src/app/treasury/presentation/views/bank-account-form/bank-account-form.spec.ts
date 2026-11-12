import { FormControl } from '@angular/forms';
import { OPENING_BALANCE_VALIDATORS } from './bank-account-form';

const errorsOf = (value: number | null) => new FormControl(value, OPENING_BALANCE_VALIDATORS).errors;

describe('OPENING_BALANCE_VALIDATORS', () => {
  it('accepts zero, because an account can be opened empty', () => {
    expect(errorsOf(0)).toBeNull();
  });

  it('accepts a positive amount with up to 2 decimals', () => {
    expect(errorsOf(20000)).toBeNull();
    expect(errorsOf(1850.5)).toBeNull();
  });

  it('requires a value, never negative, with at most 2 decimals and 12 integer digits', () => {
    expect(errorsOf(null)).toHaveProperty('required');
    expect(errorsOf(-1)).toHaveProperty('min');
    expect(errorsOf(10.005)).toHaveProperty('decimals');
    expect(errorsOf(1_000_000_000_000)).toHaveProperty('max');
  });
});
