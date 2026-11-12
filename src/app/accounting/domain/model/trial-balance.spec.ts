import { TrialBalance, TrialBalanceLine } from './trial-balance';

const line = (accountCode: string, debit: number, credit: number) =>
  new TrialBalanceLine({ accountCode, accountName: accountCode, debit, credit, currency: 'PEN' });

/** October 2026 of the seed: the six entries 201–206 summed by account. */
const october = () =>
  new TrialBalance({
    year: 2026,
    month: 10,
    lines: [
      line('12', 413000, 0),
      line('40111', 21600, 63000),
      line('42', 1200, 146300),
      line('60', 120000, 0),
      line('63', 4700, 1200),
      line('70', 0, 350000),
    ],
  });

describe('TrialBalance (what each account moved in the month)', () => {
  it('gives each account its balance as debit minus credit', () => {
    const [receivables, igv] = october().lines;
    expect(receivables.balance()).toBe(413000);
    expect(igv.balance()).toBe(-41400);
  });

  it('adds up the totals the backend does not send (October: 560,500 on each side)', () => {
    const balance = october();
    expect(balance.totalDebit()).toBe(560500);
    expect(balance.totalCredit()).toBe(560500);
    expect(balance.totalBalance()).toBe(0);
    expect(balance.isBalanced()).toBe(true);
  });

  it('tells when debit and credit do not match', () => {
    const balance = new TrialBalance({ year: 2026, month: 10, lines: [line('63', 100, 0), line('42', 0, 99.99)] });
    expect(balance.isBalanced()).toBe(false);
    expect(balance.totalBalance()).toBe(0.01);
  });

  it('is empty for a month without movements', () => {
    const balance = new TrialBalance({ year: 2026, month: 11, lines: [] });
    expect(balance.isEmpty()).toBe(true);
    expect(balance.totalDebit()).toBe(0);
  });

  it('does not drift with cents', () => {
    const balance = new TrialBalance({ year: 2026, month: 10, lines: [line('10', 0.1, 0), line('12', 0.2, 0), line('42', 0, 0.3)] });
    expect(balance.isBalanced()).toBe(true);
  });
});
