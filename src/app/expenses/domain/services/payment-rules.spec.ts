import { BankAccount, BankAccountType } from '../../../treasury/domain/model/bank-account.entity';
import { PaymentMethod } from '../model/payment-method';
import { accountsFor, needsAccount, needsPartner } from './payment-rules';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `0${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

const accounts = [
  account(1, BankAccountType.CHECKING),
  account(2, BankAccountType.CHECKING, 'USD'),
  account(3, BankAccountType.DETRACTIONS),
  account(4, BankAccountType.PETTY_CASH),
];

describe('payment rules', () => {
  it('asks for the partner only on a partner contribution and for an account otherwise', () => {
    expect(needsPartner(PaymentMethod.PARTNER_CONTRIBUTION)).toBe(true);
    expect(needsAccount(PaymentMethod.PARTNER_CONTRIBUTION)).toBe(false);
    expect(needsAccount(PaymentMethod.BANK_ACCOUNT)).toBe(true);
    expect(needsAccount(PaymentMethod.PETTY_CASH)).toBe(true);
    expect(needsPartner(PaymentMethod.PETTY_CASH)).toBe(false);
  });

  it('offers PEN bank accounts but not petty cash for a bank payment', () => {
    expect(accountsFor(PaymentMethod.BANK_ACCOUNT, accounts).map((a) => a.id)).toEqual([1, 3]);
  });

  it('offers only the petty cash account for a petty cash payment', () => {
    expect(accountsFor(PaymentMethod.PETTY_CASH, accounts).map((a) => a.id)).toEqual([4]);
  });

  it('offers no account for a partner contribution', () => {
    expect(accountsFor(PaymentMethod.PARTNER_CONTRIBUTION, accounts)).toEqual([]);
  });
});
