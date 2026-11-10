/**
 * Pays a tax return (backend `PayTaxReturnResource`): the account is required. When there is something to pay the
 * backend posts the entry (debit 40111 and 4017, credit 10) and takes the total out of that account.
 */
export interface PayTaxReturnCommand {
  paidOn: string;
  bankAccountId: number;
}
