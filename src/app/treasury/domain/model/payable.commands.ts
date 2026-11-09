/**
 * A payment of a payable (backend `RegisterPayablePaymentResource`): the account is required and the amount can
 * not exceed the balance. It posts a cash outflow in that account.
 */
export interface RegisterPayablePaymentCommand {
  paidOn: string;
  amount: number;
  bankAccountId: number;
}
