import { FormControl } from '@angular/forms';
import { USEFUL_LIFE_VALIDATORS } from './fixed-asset-form';

const lifeErrors = (value: number | null) => new FormControl<number | null>(value, USEFUL_LIFE_VALIDATORS).errors;

describe('useful life field (whole months, 1 to 600)', () => {
  it('accepts the limits', () => {
    expect(lifeErrors(1)).toBeNull();
    expect(lifeErrors(600)).toBeNull();
  });

  it('rejects an empty field, 0, more than 600 and a fraction', () => {
    expect(lifeErrors(null)).toHaveProperty('required');
    expect(lifeErrors(0)).toHaveProperty('min');
    expect(lifeErrors(601)).toHaveProperty('max');
    expect(lifeErrors(12.5)).toHaveProperty('pattern');
  });
});
