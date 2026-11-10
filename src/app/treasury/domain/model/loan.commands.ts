import { LoanType } from './loan.entity';

/**
 * A loan to register (backend `RegisterLoanResource`). The account is required: the disbursement moves its cash
 * (an inflow when received, an outflow when granted) and its currency must match the loan's. The rate is a
 * fraction, as the backend `Percentage` (the form converts from a percentage).
 */
export interface RegisterLoanCommand {
  type: LoanType;
  counterparty: string;
  principal: number;
  currency: string;
  interestRate: number;
  disbursedOn: string;
  bankAccountId: number;
}
