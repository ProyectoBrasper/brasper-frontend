import { fromIsoDate, toIsoDate } from '../../../shared/domain/model/iso-date';
import { Loan, LoanInstallment, LoanType } from '../model/loan.entity';

const toCents = (amount: number) => Math.round(amount * 100);
const sum = (amounts: readonly number[]) => amounts.reduce((total, amount) => total + toCents(amount), 0) / 100;

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

/**
 * The balance an account would have after paying an installment: the cash goes the other way than the
 * disbursement (the company pays back what it received, or collects what it lent).
 */
export function balanceAfterInstallment(type: LoanType, currentBalance: number, total: number): number {
  return balanceAfterDisbursement(type === LoanType.RECEIVED ? LoanType.GRANTED : LoanType.RECEIVED, currentBalance, total);
}

/** The installments by due date (then by id), as the table numbers them. */
export function sortedInstallments(loan: Loan): LoanInstallment[] {
  return [...loan.installments].sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id - b.id);
}

/** Capital not yet in any installment: what can still be scheduled (the backend rejects more with a 409). */
export function unscheduledPrincipal(loan: Loan): number {
  return (toCents(loan.principal) - toCents(sum(loan.installments.map((i) => i.principal)))) / 100;
}

/** Totals of the installments table: capital, interest and both together. */
export function installmentTotals(installments: readonly LoanInstallment[]): { principal: number; interest: number; total: number } {
  return {
    principal: sum(installments.map((i) => i.principal)),
    interest: sum(installments.map((i) => i.interest)),
    total: sum(installments.map((i) => i.total())),
  };
}

/** Share of the capital already paid back, from 0 to 1 (0 for a loan without capital). */
export function paidShare(loan: Loan): number {
  return loan.principal > 0 ? (toCents(loan.principal) - toCents(loan.outstandingBalance)) / toCents(loan.principal) : 0;
}

/**
 * Due date proposed for the next installment: a month after the last one (or after the disbursement), on the same
 * day when the month has it, else on its last day (31 Jan → 28 Feb).
 */
export function nextDueDate(loan: Loan): string {
  const last = sortedInstallments(loan).at(-1)?.dueOn ?? loan.disbursedOn;
  const from = fromIsoDate(last) ?? new Date();
  const lastDayOfNextMonth = new Date(from.getFullYear(), from.getMonth() + 2, 0).getDate();
  return toIsoDate(new Date(from.getFullYear(), from.getMonth() + 1, Math.min(from.getDate(), lastDayOfNextMonth)));
}
