import { LedgerAccount, LedgerAccountType } from '../model/ledger-account.entity';

/**
 * Type the code suggests by its first digit, as in the Peruvian chart of accounts (PCGE): 1–3 assets, 4 liabilities,
 * 5 equity, 6 expenses, 7 revenue. Only a suggestion: there are exceptions (the backend has 122 "Customer advances"
 * as a liability) and 8 and 9 have no type, so the form lets the user change it. Null when the code says nothing.
 */
export function typeForCode(code: string): LedgerAccountType | null {
  switch (code.trim().charAt(0)) {
    case '1':
    case '2':
    case '3':
      return LedgerAccountType.ASSET;
    case '4':
      return LedgerAccountType.LIABILITY;
    case '5':
      return LedgerAccountType.EQUITY;
    case '6':
      return LedgerAccountType.EXPENSE;
    case '7':
      return LedgerAccountType.REVENUE;
    default:
      return null;
  }
}

/** How many accounts are of a type (`null` = all of them), for the filter chips. */
export function countByType(accounts: readonly LedgerAccount[], type: LedgerAccountType | null): number {
  return type === null ? accounts.length : accounts.filter((account) => account.type === type).length;
}

/** By code as text, like the backend (`"10" < "122" < "16"`), so a sub-account sits under its parent. */
export function sortByCode(accounts: readonly LedgerAccount[]): LedgerAccount[] {
  return [...accounts].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}
