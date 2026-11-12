import { LedgerAccountType } from '../model/ledger-account.entity';
import { backendChart } from '../../testing/ledger-account-fixtures';
import { countByType, sortByCode, typeForCode } from './ledger-account-figures';

describe('ledger account figures', () => {
  it('proposes the type from the first digit, as in the PCGE', () => {
    expect(typeForCode('10')).toBe(LedgerAccountType.ASSET);
    expect(typeForCode('33411')).toBe(LedgerAccountType.ASSET);
    expect(typeForCode('40111')).toBe(LedgerAccountType.LIABILITY);
    expect(typeForCode('50')).toBe(LedgerAccountType.EQUITY);
    expect(typeForCode('6')).toBe(LedgerAccountType.EXPENSE);
    expect(typeForCode('77')).toBe(LedgerAccountType.REVENUE);
  });

  it('proposes nothing for 8, 9, an empty code or text', () => {
    expect(typeForCode('80')).toBeNull();
    expect(typeForCode('94')).toBeNull();
    expect(typeForCode('')).toBeNull();
    expect(typeForCode('x1')).toBeNull();
  });

  it('counts the backend chart by type for the chips (21 / 5 / 6 / 2 / 2 / 6)', () => {
    const chart = backendChart();
    expect(countByType(chart, null)).toBe(21);
    expect(countByType(chart, LedgerAccountType.ASSET)).toBe(5);
    expect(countByType(chart, LedgerAccountType.LIABILITY)).toBe(6);
    expect(countByType(chart, LedgerAccountType.EQUITY)).toBe(2);
    expect(countByType(chart, LedgerAccountType.REVENUE)).toBe(2);
    expect(countByType(chart, LedgerAccountType.EXPENSE)).toBe(6);
  });

  it('sorts by code as text, like the backend: a sub-account sits under its parent', () => {
    const codes = sortByCode(backendChart()).map((account) => account.code);
    expect(codes.slice(0, 6)).toEqual(['10', '12', '122', '16', '33', '39']);
    expect(codes.slice(6, 10)).toEqual(['40111', '4017', '42', '45']);
    expect(codes.at(-1)).toBe('77');
  });
});
