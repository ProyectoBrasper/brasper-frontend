import { BankAccount, BankAccountType } from '../../../../treasury/domain/model/bank-account.entity';
import { payingAccounts } from './register-fixed-cost-payment-dialog';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `0${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

describe('payingAccounts', () => {
  it('offers the accounts in the cost currency, checking first, then petty cash, then the rest', () => {
    const accounts = [
      account(3, BankAccountType.DETRACTIONS),
      account(4, BankAccountType.PETTY_CASH),
      account(2, BankAccountType.CHECKING),
      account(5, BankAccountType.CHECKING, 'USD'),
      account(1, BankAccountType.CHECKING),
    ];
    expect(payingAccounts(accounts, 'PEN').map((a) => a.id)).toEqual([1, 2, 4, 3]);
  });

  it('is empty without accounts in the currency', () => {
    expect(payingAccounts([account(5, BankAccountType.CHECKING, 'USD')], 'PEN')).toEqual([]);
  });
});
