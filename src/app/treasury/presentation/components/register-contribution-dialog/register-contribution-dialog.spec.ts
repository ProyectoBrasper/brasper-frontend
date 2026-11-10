import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { contributionAccounts } from './register-contribution-dialog';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `00${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

describe('contributionAccounts (where a contribution can come in)', () => {
  it('offers the PEN accounts, checking ones first, and leaves out other currencies', () => {
    const accounts = [
      account(4, BankAccountType.PETTY_CASH),
      account(3, BankAccountType.DETRACTIONS),
      account(2, BankAccountType.CHECKING),
      account(1, BankAccountType.CHECKING),
      account(5, BankAccountType.CHECKING, 'USD'),
    ];
    expect(contributionAccounts(accounts).map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });

  it('is empty when there are no accounts yet', () => {
    expect(contributionAccounts([])).toEqual([]);
  });
});
