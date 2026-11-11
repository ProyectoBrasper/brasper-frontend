import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { defaultDisposalDate } from './dispose-fixed-asset-dialog';

describe('defaultDisposalDate (a disposal never goes before the acquisition)', () => {
  const today = new Date(2026, 10, 10);

  it('proposes today for an asset acquired earlier', () => {
    expect(toIsoDate(defaultDisposalDate('2026-06-15', today))).toBe('2026-11-10');
  });

  it('proposes the acquisition date of an asset dated after today', () => {
    expect(toIsoDate(defaultDisposalDate('2026-12-01', today))).toBe('2026-12-01');
  });
});
