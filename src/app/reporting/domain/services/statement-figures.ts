import { BalanceSheetAmounts, UNCLOSED_RESULT } from '../model/balance-sheet';

/** One line of a statement; `code` is null for what is not an account. */
export interface StatementRow {
  code: string | null;
  label: string;
  amount: number;
}

/**
 * The rows of a balance sheet section, by code as text. The backend map has no order, so it is set here. The name
 * comes from the chart of accounts (the code while it loads) and the unclosed result goes last.
 */
export function statementRows(
  amounts: BalanceSheetAmounts,
  nameOf: (code: string) => string | undefined,
  resultLabel: string,
): StatementRow[] {
  const accounts = Object.keys(amounts)
    .filter((code) => code !== UNCLOSED_RESULT)
    .sort()
    .map((code) => ({ code, label: nameOf(code) ?? code, amount: amounts[code] }));
  return UNCLOSED_RESULT in amounts ? [...accounts, { code: null, label: resultLabel, amount: amounts[UNCLOSED_RESULT] }] : accounts;
}
