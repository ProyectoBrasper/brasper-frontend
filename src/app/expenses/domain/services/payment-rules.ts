import { BankAccount, BankAccountType } from '../../../treasury/domain/model/bank-account.entity';
import { PaymentMethod } from '../model/payment-method';

/** Bank and petty cash payments name an account; a partner contribution names the partner. Never both. */
export const needsPartner = (method: PaymentMethod): boolean => method === PaymentMethod.PARTNER_CONTRIBUTION;

export const needsAccount = (method: PaymentMethod): boolean => !needsPartner(method);

/**
 * Accounts that can pay an expense: petty cash pays from the petty cash account, a bank payment from any
 * other account; and only in PEN (expenses are PEN-only for now).
 */
export function accountsFor(method: PaymentMethod, accounts: readonly BankAccount[]): BankAccount[] {
  if (!needsAccount(method)) {
    return [];
  }
  return accounts.filter(
    (account) =>
      account.currency === 'PEN' &&
      (method === PaymentMethod.PETTY_CASH
        ? account.type === BankAccountType.PETTY_CASH
        : account.type !== BankAccountType.PETTY_CASH),
  );
}
