import { FormControl } from '@angular/forms';
import { DNI_PATTERN } from '../../views/employee-form/employee-form';
import { notBefore } from './terminate-employee-dialog';

describe('notBefore (termination date)', () => {
  const validator = notBefore('2025-06-12');

  it('rejects a date before hiring', () => {
    expect(new FormControl(new Date(2025, 5, 11), validator).errors).toEqual({ notBeforeHiring: true });
  });

  it('accepts the hiring date itself and later dates', () => {
    expect(new FormControl(new Date(2025, 5, 12), validator).errors).toBeNull();
    expect(new FormControl(new Date(2026, 8, 30), validator).errors).toBeNull();
  });

  it('leaves an empty or unparsable value to the other validators', () => {
    expect(new FormControl(null, validator).errors).toBeNull();
    expect(new FormControl(new Date('x'), validator).errors).toBeNull();
  });
});

describe('DNI_PATTERN', () => {
  it.each(['41234561', '00000001'])('accepts %s', (dni) => expect(DNI_PATTERN.test(dni)).toBe(true));
  it.each(['4123456', '412345612', '4123456a', ''])('rejects "%s"', (dni) => expect(DNI_PATTERN.test(dni)).toBe(false));
});
