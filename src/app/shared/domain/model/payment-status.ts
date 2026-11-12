/**
 * Whether an obligation (an expense, a payable) has been settled (backend shared `PaymentStatus`): pending →
 * partially paid → paid.
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export const PAYMENT_STATUSES: readonly PaymentStatus[] = Object.values(PaymentStatus);
