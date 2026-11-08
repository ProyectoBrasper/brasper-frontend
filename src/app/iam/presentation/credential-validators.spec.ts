import { FormControl } from '@angular/forms';
import { passwordValidator, usernameValidator } from './credential-validators';

const check = (validator: typeof usernameValidator, value: string) => validator(new FormControl(value));

describe('credential validators', () => {
  it('accepts usernames that follow the backend rule', () => {
    expect(check(usernameValidator, 'cmendoza')).toBeNull();
    expect(check(usernameValidator, 'l.vargas_2')).toBeNull();
  });

  it('rejects uppercase, spaces or too short usernames', () => {
    expect(check(usernameValidator, 'CMendoza')).toEqual({ username: true });
    expect(check(usernameValidator, 'c m')).toEqual({ username: true });
    expect(check(usernameValidator, 'ab')).toEqual({ username: true });
  });

  it('requires 8+ characters with a letter and a digit in passwords', () => {
    expect(check(passwordValidator, 'clave2026')).toBeNull();
    expect(check(passwordValidator, 'short1')).toEqual({ password: true });
    expect(check(passwordValidator, 'onlyletters')).toEqual({ password: true });
    expect(check(passwordValidator, '12345678')).toEqual({ password: true });
  });

  it('leaves empty values to the required validator', () => {
    expect(check(usernameValidator, '')).toBeNull();
    expect(check(passwordValidator, '')).toBeNull();
  });
});
