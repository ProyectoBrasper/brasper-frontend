import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { payableAccounts } from './register-payable-payment-dialog';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `0${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

describe('payableAccounts', () => {
  it('offers the accounts in the payable currency, checking accounts first', () => {
    const accounts = [
      account(4, BankAccountType.PETTY_CASH),
      account(3, BankAccountType.DETRACTIONS),
      account(2, BankAccountType.CHECKING),
      account(5, BankAccountType.CHECKING, 'USD'),
      account(1, BankAccountType.CHECKING),
    ];
    expect(payableAccounts(accounts, 'PEN').map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });
});
