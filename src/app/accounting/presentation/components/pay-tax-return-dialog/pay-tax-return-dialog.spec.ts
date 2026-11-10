import { BankAccount, BankAccountType } from '../../../../treasury/domain/model/bank-account.entity';
import { taxPaymentAccounts } from './pay-tax-return-dialog';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `00${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

describe('taxPaymentAccounts (where a tax return can be paid from)', () => {
  it('offers the accounts in the return currency, checking ones first', () => {
    const accounts = [
      account(4, BankAccountType.PETTY_CASH),
      account(3, BankAccountType.DETRACTIONS),
      account(1, BankAccountType.CHECKING),
      account(5, BankAccountType.CHECKING, 'USD'),
    ];
    expect(taxPaymentAccounts(accounts, 'PEN').map((a) => a.id)).toEqual([1, 3, 4]);
  });
});
