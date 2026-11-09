import { PaymentStatus } from '../../../shared/domain/model/payment-status';
import { Payable } from '../model/payable.entity';

const toCents = (amount: number) => Math.round(amount * 100);

/** What is still owed: sum of the balances of the payables that are not paid, in cents. */
export function outstandingBalance(payables: readonly Payable[]): number {
  return payables.filter((p) => !p.isPaid()).reduce((sum, p) => sum + toCents(p.balance), 0) / 100;
}

/** How many payables have a status (`null` = all of them), for the filter chips. */
export function countByStatus(payables: readonly Payable[], status: PaymentStatus | null): number {
  return status === null ? payables.length : payables.filter((p) => p.status === status).length;
}
