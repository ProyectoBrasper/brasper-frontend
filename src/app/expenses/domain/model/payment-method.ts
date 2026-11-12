/**
 * How an expense was paid (backend `PaymentMethod`): bank account and petty cash name the account;
 * a partner contribution names the partner.
 */
export enum PaymentMethod {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  PETTY_CASH = 'PETTY_CASH',
  PARTNER_CONTRIBUTION = 'PARTNER_CONTRIBUTION',
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = Object.values(PaymentMethod);
