import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { Bank, BankAccount, BankAccountType } from '../domain/model/bank-account.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';
import { TreasuryStore } from './treasury.store';

const account = (id: number, currentBalance: number, type = BankAccountType.CHECKING, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `00${id}`, type, currency, openingBalance: currentBalance, currentBalance });

/** The 4 accounts of DATOS.md §8 (S/ 494,350.00 in total). */
const datosAccounts = () => [
  account(1, 318450),
  account(2, 96200),
  account(3, 76200, BankAccountType.DETRACTIONS),
  account(4, 3500, BankAccountType.PETTY_CASH),
];

describe('TreasuryStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let role: Role;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TreasuryApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: (...roles: Role[]) => roles.includes(role) } },
        { provide: Router, useValue: router },
      ],
    });
    return TestBed.inject(TreasuryStore);
  };

  beforeEach(() => {
    role = Role.ROLE_ACCOUNTING;
    router = { navigate: vi.fn() };
    api = { getBankAccounts: vi.fn().mockReturnValue(of(datosAccounts())), openBankAccount: vi.fn() };
  });

  it('adds up the cash of the PEN accounts (DATOS.md: S/ 494,350.00)', () => {
    const store = createStore();
    store.loadBankAccounts();
    expect(store.totalBalance()).toBe(494350);
  });

  it('adds in cents and leaves accounts in other currencies out of the PEN total', () => {
    api['getBankAccounts'].mockReturnValue(of([account(1, 0.1), account(2, 0.2), account(3, 500, BankAccountType.CHECKING, 'USD')]));
    const store = createStore();
    store.loadBankAccounts();
    expect(store.totalBalance()).toBe(0.3);
  });

  it('adds the opened account and navigates to the list', () => {
    api['openBankAccount'].mockReturnValue(of(account(5, 20000)));
    const store = createStore();
    store.loadBankAccounts();
    store.openBankAccount(
      { bank: Bank.BBVA, accountNumber: '0011-0234-0200987654', type: BankAccountType.CHECKING, currency: 'PEN', openingBalance: 20000, openedOn: '2026-11-09' },
      ['/treasury/bank-accounts'],
    );
    expect(store.bankAccounts()).toHaveLength(5);
    expect(store.totalBalance()).toBe(514350);
    expect(router.navigate).toHaveBeenCalledWith(['/treasury/bank-accounts']);
  });

  it('shows the API error and stays on the form when the number already exists', () => {
    api['openBankAccount'].mockReturnValue(throwError(() => new Error('Ya existe una cuenta bancaria con ese número.')));
    const store = createStore();
    store.openBankAccount(
      { bank: Bank.BCP, accountNumber: '193-2456789-0-12', type: BankAccountType.CHECKING, currency: 'PEN', openingBalance: 0, openedOn: '2026-11-09' },
      ['/treasury/bank-accounts'],
    );
    expect(store.error()).toBe('Ya existe una cuenta bancaria con ese número.');
    expect(store.loading()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lets admin and accounting write but not management', () => {
    expect(createStore().canWrite()).toBe(true);
    TestBed.resetTestingModule();
    role = Role.ROLE_MANAGEMENT;
    expect(createStore().canWrite()).toBe(false);
  });
});
