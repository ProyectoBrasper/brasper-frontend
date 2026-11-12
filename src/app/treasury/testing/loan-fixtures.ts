import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { Loan, LoanInstallment, LoanType } from '../domain/model/loan.entity';

/** A loan; override only what a test cares about. Defaults to loan 1 of DATOS.md §8 (BBVA, received). */
export function loanFixture(overrides: Partial<ConstructorParameters<typeof Loan>[0]> = {}): Loan {
  return new Loan({
    id: 1,
    type: LoanType.RECEIVED,
    counterparty: 'BBVA — capital de trabajo',
    principal: 200000,
    currency: 'PEN',
    interestRate: 0.12,
    disbursedOn: '2026-03-10',
    bankAccountId: 2,
    totalInterest: 9000,
    outstandingBalance: 25000,
    status: PaymentStatus.PARTIALLY_PAID,
    installments: [],
    ...overrides,
  });
}

/**
 * The 8 installments of loan 1 (DATOS.md §8): 25,000 of capital plus interest falling from 2,000 by 250, due on the
 * 10th from April 2026; the first 7 paid on their due date.
 */
export const datosLoan1Installments = (): LoanInstallment[] =>
  Array.from({ length: 8 }, (_, k) => {
    const day = `2026-${String(4 + k).padStart(2, '0')}-10`;
    return new LoanInstallment({ id: k + 1, dueOn: day, principal: 25000, interest: 2000 - 250 * k, paid: k < 7, paidOn: k < 7 ? day : null });
  });

/** The 2 loans of DATOS.md §8 (the backend computes a balance of 25,000.00 for the first one, not 25,250.00). */
export const datosLoans = (): Loan[] => [
  loanFixture(),
  loanFixture({
    id: 2,
    type: LoanType.GRANTED,
    counterparty: 'Ing. Walter Soto (contratista)',
    principal: 30000,
    interestRate: 0,
    disbursedOn: '2026-08-05',
    bankAccountId: 1,
    totalInterest: 0,
    outstandingBalance: 20000,
    installments: [
      new LoanInstallment({ id: 9, dueOn: '2026-09-05', principal: 10000, interest: 0, paid: true, paidOn: '2026-09-05' }),
    ],
  }),
];
