import { FormControl } from '@angular/forms';
import { maxTwoDecimals } from './expense-form';

const errorsOf = (value: number | string | null) => new FormControl(value, maxTwoDecimals).errors;

describe('maxTwoDecimals', () => {
  it.each([null, '', 0.01, 120000, 1850.5, 70800.75, 0.1 + 0.2 - 0.2])('accepts %s', (value) => {
    expect(errorsOf(value)).toBeNull();
  });

  it.each([10.005, 99.999, 0.001])('rejects %s', (value) => {
    expect(errorsOf(value)).toEqual({ decimals: true });
  });
});
