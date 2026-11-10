import { FormArray } from '@angular/forms';
import { createJournalLine, doubleEntryValidator, JournalLineForm } from './journal-lines-editor';

interface Draft {
  accountCode?: string;
  debit?: number | null;
  credit?: number | null;
}

const linesOf = (...lines: Draft[]) =>
  new FormArray<JournalLineForm>(lines.map((line) => createJournalLine({ accountCode: '63', ...line })), doubleEntryValidator);

describe('journal lines (backend JournalEntry rules)', () => {
  it('accepts two lines that balance (manual entry 204: D 63 3,500 · H 42 3,500)', () => {
    expect(linesOf({ accountCode: '63', debit: 3500 }, { accountCode: '42', credit: 3500 }).valid).toBe(true);
  });

  it('rejects an entry that does not balance', () => {
    expect(linesOf({ debit: 2000 }, { credit: 1500 }).hasError('unbalanced')).toBe(true);
  });

  it('rejects fewer than two lines and an entry with nothing to post', () => {
    expect(linesOf({ debit: 100 }).hasError('minLines')).toBe(true);
    expect(linesOf({}, {}).hasError('empty')).toBe(true);
  });

  it('rejects a line without account and a line with no side', () => {
    expect(createJournalLine({ debit: 100 }).controls.accountCode.hasError('required')).toBe(true);
    expect(createJournalLine({ accountCode: '63' }).hasError('oneSide')).toBe(true);
  });

  it('rejects a negative amount and a third decimal', () => {
    const line = createJournalLine({ accountCode: '63' });
    line.controls.debit.setValue(-5);
    expect(line.controls.debit.hasError('min')).toBe(true);
    line.controls.debit.setValue(10.005);
    expect(line.controls.debit.hasError('decimals')).toBe(true);
  });

  it('clears the other side when an amount is typed, so a line never has both', () => {
    const line = createJournalLine({ accountCode: '63', debit: 2000 });
    line.controls.credit.setValue(500);
    expect(line.controls.debit.value).toBeNull();
    expect(line.valid).toBe(true);
    line.controls.debit.setValue(700);
    expect(line.controls.credit.value).toBeNull();
  });

  it('keeps the other side when the typed amount is zero', () => {
    const line = createJournalLine({ accountCode: '63', debit: 2000 });
    line.controls.credit.setValue(0);
    expect(line.controls.debit.value).toBe(2000);
  });
});
