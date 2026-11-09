import { weekIn } from './payable-form';

describe('weekIn (keeps the chosen week when the month changes)', () => {
  it('keeps a week that exists in the new month', () => {
    expect(weekIn(2026, 10, 4)).toBe(4);
  });

  it('drops week 6, which only some months have (November 2026 yes, October 2026 no)', () => {
    expect(weekIn(2026, 11, 6)).toBe(6);
    expect(weekIn(2026, 10, 6)).toBeNull();
  });

  it('drops week 5 in a February that starts on Monday (February 2027 has 4 weeks)', () => {
    expect(weekIn(2027, 2, 5)).toBeNull();
    expect(weekIn(2027, 2, 4)).toBe(4);
  });

  it('stays empty when no week was chosen', () => {
    expect(weekIn(2026, 11, null)).toBeNull();
  });
});
