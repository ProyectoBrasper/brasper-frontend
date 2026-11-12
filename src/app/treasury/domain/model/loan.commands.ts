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

/**
 * An installment to schedule (backend `ScheduleInstallmentResource`), in the loan's currency. The capital of all the
 * installments cannot exceed the loan's (409); the interest can be zero.
 */
export interface ScheduleInstallmentCommand {
  dueOn: string;
  principal: number;
  interest: number;
}

/**
 * The payment of an installment (backend `PayInstallmentResource`): always the whole installment, capital plus
 * interest, from or into the chosen account (out when the loan was received, in when it was granted).
 */
export interface PayInstallmentCommand {
  paidOn: string;
  bankAccountId: number;
}
