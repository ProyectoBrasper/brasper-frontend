import { FormControl } from '@angular/forms';
import { SupplierType } from '../../../domain/model/supplier-type';
import { rucValidators } from './supplier-form';

const errorsFor = (type: SupplierType, value: string) => {
  const control = new FormControl(value, rucValidators(type));
  return control.errors;
};

describe('rucValidators', () => {
  it('requires a RUC for a company', () => {
    expect(errorsFor(SupplierType.COMPANY, '')).toHaveProperty('required');
  });

  it('lets a natural person leave the RUC empty', () => {
    expect(errorsFor(SupplierType.NATURAL_PERSON, '')).toBeNull();
  });

  it('rejects a RUC that does not have 11 digits, for any type', () => {
    expect(errorsFor(SupplierType.COMPANY, '2060111222')).toHaveProperty('pattern');
    expect(errorsFor(SupplierType.NATURAL_PERSON, '1234')).toHaveProperty('pattern');
  });

  it('accepts an 11-digit RUC', () => {
    expect(errorsFor(SupplierType.COMPANY, '20601112221')).toBeNull();
    expect(errorsFor(SupplierType.NATURAL_PERSON, '10456789012')).toBeNull();
  });
});
