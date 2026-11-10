import { Loan, LoanType } from '../model/loan.entity';

/** How many loans are of a type (`null` = all of them), for the filter chips. */
export function countByType(loans: readonly Loan[], type: LoanType | null): number {
  return type === null ? loans.length : loans.filter((loan) => loan.type === type).length;
}

/**
 * The balance an account would have after the disbursement: a received loan adds to it, a granted one takes from
 * it. Computed in cents so the sum does not drift.
 */
export function balanceAfterDisbursement(type: LoanType, currentBalance: number, principal: number): number {
  const sign = type === LoanType.RECEIVED ? 1 : -1;
  return (Math.round(currentBalance * 100) + sign * Math.round(principal * 100)) / 100;
}
