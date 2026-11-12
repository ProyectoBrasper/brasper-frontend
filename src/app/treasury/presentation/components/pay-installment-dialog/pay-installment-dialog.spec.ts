import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { loanFixture } from '../../../testing/loan-fixtures';
import { installmentAccounts } from './pay-installment-dialog';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `00${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

describe('installmentAccounts (where an installment can be paid)', () => {
  const accounts = [
    account(1, BankAccountType.CHECKING),
    account(2, BankAccountType.CHECKING),
    account(3, BankAccountType.DETRACTIONS),
    account(4, BankAccountType.PETTY_CASH),
    account(5, BankAccountType.CHECKING, 'USD'),
  ];

  it("puts the loan's own account first, then checking ones, and leaves out other currencies", () => {
    expect(installmentAccounts(accounts, loanFixture({ bankAccountId: 2 })).map((a) => a.id)).toEqual([2, 1, 3, 4]);
  });

  it('still offers every account in the currency when the loan account is not among them', () => {
    expect(installmentAccounts(accounts, loanFixture({ bankAccountId: 9 })).map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });
});
