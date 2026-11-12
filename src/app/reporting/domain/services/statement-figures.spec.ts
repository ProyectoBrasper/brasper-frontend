import { BalanceSheet } from '../model/balance-sheet';
import { statementRows } from './statement-figures';

describe('statementRows', () => {
  const names: Record<string, string> = { '10': 'Caja', '39': 'Depreciación acumulada' };
  const nameOf = (code: string) => names[code];

  it('orders by code as text and names each account', () => {
    expect(statementRows({ '39': -4000, '10': 500 }, nameOf, 'Result')).toEqual([
      { code: '10', label: 'Caja', amount: 500 },
      { code: '39', label: 'Depreciación acumulada', amount: -4000 },
    ]);
  });

  it('shows the code while the chart has not loaded', () => {
    expect(statementRows({ '12': 1 }, nameOf, 'Result')[0].label).toBe('12');
  });

  it('puts the unclosed result last, without a code', () => {
    const rows = statementRows({ RESULT: 300, '50': 100 }, nameOf, 'Sin cerrar');
    expect(rows.map((row) => row.code)).toEqual(['50', null]);
    expect(rows[1]).toEqual({ code: null, label: 'Sin cerrar', amount: 300 });
  });
});

describe('BalanceSheet', () => {
  it('adds liabilities and equity in cents', () => {
    const sheet = new BalanceSheet({
      asOf: '2026-10-31',
      assets: {},
      liabilities: {},
      equity: {},
      totalAssets: 0.3,
      totalLiabilities: 0.1,
      totalEquity: 0.2,
      difference: 0,
      balanced: true,
    });
    expect(sheet.totalLiabilitiesAndEquity()).toBe(0.3);
  });
});
