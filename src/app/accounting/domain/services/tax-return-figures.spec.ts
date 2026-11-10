import { Period } from '../../../shared/domain/model/period';
import { octoberDraft, taxReturnFixture } from '../../testing/tax-return-fixtures';
import { previousReturn, returnFor } from './tax-return-figures';

describe('tax return figures', () => {
  const history = [octoberDraft(), taxReturnFixture()];

  it('finds the return of a month and the one before', () => {
    expect(returnFor(history, new Period(2026, 10))?.id).toBe(2);
    expect(previousReturn(history, new Period(2026, 10))?.id).toBe(1);
  });

  it('finds none for a month that was not prepared', () => {
    expect(returnFor(history, new Period(2026, 11))).toBeUndefined();
    expect(previousReturn(history, new Period(2026, 9))).toBeUndefined();
  });

  it('goes back across the year (January looks at December)', () => {
    const december = taxReturnFixture({ id: 3, year: 2025, month: 12 });
    expect(previousReturn([december], new Period(2026, 1))?.id).toBe(3);
  });
});

describe('TaxReturn', () => {
  it('leaves no credit when the output IGV is above the input (September: 48,600 vs 30,200)', () => {
    expect(taxReturnFixture().nextCarriedCredit()).toBe(0);
    expect(taxReturnFixture().isPaid()).toBe(true);
  });

  it('leaves as credit what the input and the carried credit exceed the output by', () => {
    const credit = taxReturnFixture({ outputIgv: 10000, inputIgv: 15000, carriedCredit: 1200.5 });
    expect(credit.nextCarriedCredit()).toBe(6200.5);
  });

  it('knows its period and that a draft is not paid', () => {
    const draft = octoberDraft();
    expect(draft.period().month).toBe(10);
    expect(draft.isPaid()).toBe(false);
  });
});
