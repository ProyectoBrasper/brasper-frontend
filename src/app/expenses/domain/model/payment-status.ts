/** Whether an obligation has been settled (backend `PaymentStatus`). */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}
