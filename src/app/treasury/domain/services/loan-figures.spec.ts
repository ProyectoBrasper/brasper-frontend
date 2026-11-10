import { InstallmentStatus, LoanInstallment, LoanType } from '../model/loan.entity';
import { datosLoan1Installments, datosLoans, loanFixture } from '../../testing/loan-fixtures';
import {
  balanceAfterDisbursement,
  balanceAfterInstallment,
  countByType,
  installmentTotals,
  nextDueDate,
  paidShare,
  sortedInstallments,
  unscheduledPrincipal,
} from './loan-figures';

const installment = (id: number, dueOn: string, principal = 10000, paid = false) =>
  new LoanInstallment({ id, dueOn, principal, interest: 0, paid, paidOn: paid ? dueOn : null });

describe('loan figures', () => {
  it('counts loans by type for the filter chips (2 / 1 / 1)', () => {
    const loans = datosLoans();
    expect(countByType(loans, null)).toBe(2);
    expect(countByType(loans, LoanType.RECEIVED)).toBe(1);
    expect(countByType(loans, LoanType.GRANTED)).toBe(1);
  });

  it('adds a received loan to the account balance', () => {
    expect(balanceAfterDisbursement(LoanType.RECEIVED, 96200, 200000)).toBe(296200);
  });

  it('takes a granted loan out of the account balance', () => {
    expect(balanceAfterDisbursement(LoanType.GRANTED, 318450, 30000)).toBe(288450);
  });

  it('goes negative when a granted loan is bigger than the balance', () => {
    expect(balanceAfterDisbursement(LoanType.GRANTED, 3500, 5000)).toBe(-1500);
  });

  it('does not drift with cents', () => {
    expect(balanceAfterDisbursement(LoanType.GRANTED, 0.3, 0.1)).toBe(0.2);
  });

  it('moves the cash of an installment the other way than the disbursement', () => {
    expect(balanceAfterInstallment(LoanType.RECEIVED, 96200, 25250)).toBe(70950);
    expect(balanceAfterInstallment(LoanType.GRANTED, 318450, 10000)).toBe(328450);
  });

  it('numbers the installments by due date, then by id', () => {
    const loan = loanFixture({
      installments: [installment(3, '2026-12-10'), installment(1, '2026-11-10'), installment(2, '2026-11-10')],
    });
    expect(sortedInstallments(loan).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('leaves no capital to schedule for loan 1 and 20,000 when 1 of 3 installments of loan 2 is scheduled', () => {
    expect(unscheduledPrincipal(loanFixture({ installments: datosLoan1Installments() }))).toBe(0);
    expect(unscheduledPrincipal(datosLoans()[1])).toBe(20000);
  });

  it('adds up the installments table of loan 1 (200,000 + 9,000 = 209,000)', () => {
    expect(installmentTotals(datosLoan1Installments())).toEqual({ principal: 200000, interest: 9000, total: 209000 });
  });

  it('measures the capital paid back (loan 1: 87.5 %)', () => {
    expect(paidShare(loanFixture())).toBe(0.875);
    expect(paidShare(loanFixture({ outstandingBalance: 200000 }))).toBe(0);
  });

  it('proposes the next due date a month after the last installment, or after the disbursement', () => {
    expect(nextDueDate(loanFixture({ installments: datosLoan1Installments() }))).toBe('2026-12-10');
    expect(nextDueDate(loanFixture({ disbursedOn: '2026-11-09', installments: [] }))).toBe('2026-12-09');
  });

  it('keeps the next due date inside a shorter month (31 Jan → 28 Feb, 31 Dec → 31 Jan)', () => {
    expect(nextDueDate(loanFixture({ disbursedOn: '2027-01-31', installments: [] }))).toBe('2027-02-28');
    expect(nextDueDate(loanFixture({ disbursedOn: '2026-12-31', installments: [] }))).toBe('2027-01-31');
  });
});

describe('installment status (the backend only knows paid or not)', () => {
  it('is overdue from the day after its due date while unpaid (loan 2: 05/10 overdue on 09/11)', () => {
    expect(installment(10, '2026-10-05').status('2026-11-09')).toBe(InstallmentStatus.OVERDUE);
  });

  it('is still pending on its due date and before it', () => {
    expect(installment(11, '2026-11-09').status('2026-11-09')).toBe(InstallmentStatus.PENDING);
    expect(installment(11, '2026-12-05').status('2026-11-09')).toBe(InstallmentStatus.PENDING);
  });

  it('is paid when paid, even if it was due long ago', () => {
    expect(installment(9, '2026-09-05', 10000, true).status('2026-11-09')).toBe(InstallmentStatus.PAID);
  });
});
