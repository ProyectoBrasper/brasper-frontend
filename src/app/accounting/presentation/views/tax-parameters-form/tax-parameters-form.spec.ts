import { FormControl } from '@angular/forms';
import { TaxParameters } from '../../../domain/model/tax-parameters.entity';
import { effectiveDateFree, TAX_RATE_VALIDATORS } from './tax-parameters-form';

const rateErrors = (value: number | null) => new FormControl<number | null>(value, TAX_RATE_VALIDATORS).errors;

describe('tax rate fields (0 to 100 %, 2 decimals)', () => {
  it('accepts 0, 1.5 and 100', () => {
    expect(rateErrors(0)).toBeNull();
    expect(rateErrors(1.5)).toBeNull();
    expect(rateErrors(100)).toBeNull();
  });

  it('rejects an empty field, a negative rate, more than 100 and a third decimal', () => {
    expect(rateErrors(null)).toHaveProperty('required');
    expect(rateErrors(-1)).toHaveProperty('min');
    expect(rateErrors(100.5)).toHaveProperty('max');
    expect(rateErrors(1.555)).toHaveProperty('decimals');
  });
});

describe('effective date (each date once, backend 409)', () => {
  const history = [
    new TaxParameters({ id: 1, effectiveFrom: '2026-01-01', igv: 0.18, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 }),
  ];

  it('rejects a date already used and accepts a new one', () => {
    expect(new FormControl(new Date(2026, 0, 1), effectiveDateFree(() => history)).errors).toHaveProperty('dateInUse');
    expect(new FormControl(new Date(2027, 0, 1), effectiveDateFree(() => history)).errors).toBeNull();
  });

  it('leaves an empty date to the required validator', () => {
    expect(new FormControl(null, effectiveDateFree(() => history)).errors).toBeNull();
  });
});
