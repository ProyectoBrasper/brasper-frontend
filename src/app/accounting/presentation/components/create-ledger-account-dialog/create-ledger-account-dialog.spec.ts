import { FormControl, Validators } from '@angular/forms';
import { ACCOUNT_CODE_PATTERN } from '../../../domain/model/ledger-account.entity';
import { codeNotInUse } from './create-ledger-account-dialog';

const errorsOf = (code: string) =>
  new FormControl(code, [Validators.required, Validators.pattern(ACCOUNT_CODE_PATTERN), codeNotInUse(['10', '40111'])])
    .errors;

describe('ledger account code (backend AccountCode: 2 to 10 digits, starting with 1 to 9, unique)', () => {
  it('accepts a new code of 2 to 10 digits', () => {
    expect(errorsOf('10411')).toBeNull();
    expect(errorsOf('11')).toBeNull();
    expect(errorsOf('1234567890')).toBeNull();
  });

  it('rejects one digit, eleven digits, a leading 0 and letters', () => {
    expect(errorsOf('1')).toHaveProperty('pattern');
    expect(errorsOf('12345678901')).toHaveProperty('pattern');
    expect(errorsOf('0101')).toHaveProperty('pattern');
    expect(errorsOf('10A')).toHaveProperty('pattern');
  });

  it('rejects a code already in the chart, even with spaces around it', () => {
    expect(errorsOf('40111')).toHaveProperty('codeInUse');
    expect(new FormControl(' 10 ', codeNotInUse(['10'])).errors).toHaveProperty('codeInUse');
  });
});
