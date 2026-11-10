import { LoanType } from '../model/loan.entity';
import { datosLoans } from '../../testing/loan-fixtures';
import { balanceAfterDisbursement, countByType } from './loan-figures';

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
});
