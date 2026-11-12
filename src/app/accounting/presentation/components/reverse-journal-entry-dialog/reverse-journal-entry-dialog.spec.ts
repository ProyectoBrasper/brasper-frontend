import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { defaultReversalDate } from './reverse-journal-entry-dialog';

describe('defaultReversalDate (a reversal never goes before what it reverses)', () => {
  const today = new Date(2026, 10, 10);

  it('proposes today for an entry of an earlier day', () => {
    expect(toIsoDate(defaultReversalDate('2026-10-29', today))).toBe('2026-11-10');
  });

  it('proposes the entry date for an entry dated after today', () => {
    expect(toIsoDate(defaultReversalDate('2026-12-01', today))).toBe('2026-12-01');
  });

  it('proposes today for an entry of today', () => {
    expect(toIsoDate(defaultReversalDate('2026-11-10', today))).toBe('2026-11-10');
  });
});
