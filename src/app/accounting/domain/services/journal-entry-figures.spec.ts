import { EntrySource } from '../model/journal-entry.entity';
import { entryFixture, octoberEntries } from '../../testing/journal-entry-fixtures';
import { entryLabel, lineTotals } from './journal-entry-figures';

describe('journal entry figures', () => {
  it('adds up the lines of an entry (expense 203: 141,600 on each side)', () => {
    const expense = octoberEntries()[0];
    expect(lineTotals(expense.lines)).toEqual({ debit: 141600, credit: 141600 });
    expect(expense.isBalanced()).toBe(true);
  });

  it('keeps the typed description of a manual entry', () => {
    expect(entryLabel(entryFixture())).toBeNull();
  });

  it('labels an automatic entry by its source and the document behind it, not by the generic English text', () => {
    const invoice = entryFixture({ source: EntrySource.INVOICE_ISSUED, sourceId: 8, description: 'Invoice issued' });
    expect(entryLabel(invoice)).toEqual({ key: 'entrySource.INVOICE_ISSUED', params: {}, ref: 8 });
  });

  it('points a reversal at the entry it reverses', () => {
    const reversal = octoberEntries().find((entry) => entry.isReversal())!;
    expect(entryLabel(reversal)).toEqual({ key: 'journalEntries.reversalOf', params: { id: 205 }, ref: null });
  });
});

describe('which entries can be reversed (backend: not a reversal nor a reversed one)', () => {
  it('allows a manual and an automatic entry', () => {
    expect(entryFixture().canBeReversed()).toBe(true);
    expect(entryFixture({ source: EntrySource.EXPENSE }).canBeReversed()).toBe(true);
  });

  it('does not allow a reversed entry nor a reversal', () => {
    const [, , reversed, reversal] = octoberEntries();
    expect(reversed.canBeReversed()).toBe(false);
    expect(reversal.canBeReversed()).toBe(false);
  });

  it('tells an unbalanced entry (never from the backend, but the footer would show it)', () => {
    expect(entryFixture({ totalCredit: 3499.99 }).isBalanced()).toBe(false);
  });
});
