import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('takes the first two words', () => {
    expect(initialsOf('Carla Mendoza Rojas')).toBe('CM');
    expect(initialsOf('Agroindustrias Pampa Dorada S.A.C.')).toBe('AP');
  });

  it('skips words that do not start with a letter and handles accents', () => {
    expect(initialsOf('  Ñahui   Patricia ')).toBe('ÑP');
    expect(initialsOf('3M Perú S.A.')).toBe('PS');
  });

  it('returns an empty string for an empty name', () => {
    expect(initialsOf('')).toBe('');
  });
});
