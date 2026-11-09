import { Bank, BankAccountType } from './bank-account.entity';

/**
 * Data to open a bank account or petty cash (backend `OpenBankAccountResource`). The opening balance can be
 * zero; the current balance is never typed: the backend calculates it from the movements.
 */
export interface OpenBankAccountCommand {
  bank: Bank;
  accountNumber: string;
  type: BankAccountType;
  currency: string;
  openingBalance: number;
  openedOn: string;
}
