import { ProgressRecord } from '../../../domain/model/progress-record.entity';
import { isPeriodTaken, suggestedPeriod } from './progress-rules';

const record = (year: number, month: number) => new ProgressRecord({ id: 0, projectId: 1, year, month, percentage: 0.1 });

describe('progress rules', () => {
  const records = [record(2026, 9), record(2026, 10), record(2026, 11)];

  it('detects a month that already has progress', () => {
    expect(isPeriodTaken(records, 2026, 10)).toBe(true);
    expect(isPeriodTaken(records, 2026, 12)).toBe(false);
  });

  it('suggests the current month when it is free', () => {
    expect(suggestedPeriod(records, new Date(2026, 11, 5))).toEqual({ year: 2026, month: 12 });
  });

  it('suggests the month after the latest record when the current one is taken', () => {
    expect(suggestedPeriod(records, new Date(2026, 10, 8))).toEqual({ year: 2026, month: 12 });
  });

  it('rolls over to January of the next year', () => {
    const december = [record(2026, 11), record(2026, 12)];
    expect(suggestedPeriod(december, new Date(2026, 11, 1))).toEqual({ year: 2027, month: 1 });
  });
});
