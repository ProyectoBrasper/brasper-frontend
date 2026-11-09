import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Period } from '../../shared/domain/model/period';
import { BankAccount, BankAccountType } from '../domain/model/bank-account.entity';
import { CashMovement, MovementDirection, MovementSource } from '../domain/model/cash-movement.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';
import { TreasuryStore } from './treasury.store';

const account = (id: number, currentBalance: number) =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `00${id}`, type: BankAccountType.CHECKING, currency: 'PEN', openingBalance: 0, currentBalance });
const movement = (id: number, occurredOn: string, direction: MovementDirection, amount: number) =>
  new CashMovement({ id, occurredOn, direction, amount, concept: '', source: MovementSource.ADJUSTMENT, sourceId: null });

const OCTOBER = new Period(2026, 10);

describe('TreasuryStore — movements', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TreasuryApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    return TestBed.inject(TreasuryStore);
  };

  beforeEach(() => {
    api = {
      getBankAccounts: vi.fn().mockReturnValue(of([account(1, 318450), account(2, 96200)])),
      getMovements: vi.fn().mockReturnValue(
        of([
          movement(3, '2026-10-06', MovementDirection.INFLOW, 60000),
          movement(1, '2026-10-02', MovementDirection.OUTFLOW, 141600),
          movement(2, '2026-10-02', MovementDirection.OUTFLOW, 3500),
        ]),
      ),
      registerAdjustment: vi.fn(),
      transferFunds: vi.fn(),
    };
  });

  it('loads the movements of a month in date order with their totals', () => {
    const store = createStore();
    store.loadMovements(1, OCTOBER);
    expect(api['getMovements']).toHaveBeenCalledWith(1, 2026, 10);
    expect(store.movements().map((m) => m.id)).toEqual([1, 2, 3]);
    expect(store.movementTotals()).toEqual({ inflows: 60000, outflows: 145100 });
  });

  it('ignores a late answer for a month the user already left', () => {
    const october = new Subject<CashMovement[]>();
    api['getMovements'].mockImplementation((_: number, __: number, month: number) => (month === 10 ? october : of([])));
    const store = createStore();
    store.loadMovements(1, OCTOBER);
    store.loadMovements(1, OCTOBER.next());
    october.next([movement(1, '2026-10-02', MovementDirection.OUTFLOW, 100)]);
    october.complete();
    expect(store.movements()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('puts the adjusted account with its new balance and reloads its movements', () => {
    api['registerAdjustment'].mockReturnValue(of(account(1, 318500)));
    const store = createStore();
    store.loadBankAccounts();
    store.loadMovements(1, OCTOBER);
    store.registerAdjustment(1, { occurredOn: '2026-10-31', direction: MovementDirection.INFLOW, amount: 50, concept: 'Diferencia de caja' });
    expect(store.getBankAccountById(1)?.currentBalance).toBe(318500);
    expect(api['getMovements']).toHaveBeenCalledTimes(2);
  });

  it('re-reads every balance after a transfer, because the destination changes too', () => {
    api['transferFunds'].mockReturnValue(of(account(1, 308450)));
    const store = createStore();
    store.loadMovements(2, OCTOBER);
    store.transferFunds({ fromAccountId: 1, toAccountId: 2, transferredOn: '2026-10-31', amount: 10000, concept: '' });
    expect(api['getBankAccounts']).toHaveBeenCalledTimes(1);
    // The shown account (2) is the destination: its movements are reloaded.
    expect(api['getMovements']).toHaveBeenCalledTimes(2);
  });

  it('does not reload movements of an account that was not part of the transfer', () => {
    api['transferFunds'].mockReturnValue(of(account(1, 308450)));
    const store = createStore();
    store.loadMovements(4, OCTOBER);
    store.transferFunds({ fromAccountId: 1, toAccountId: 2, transferredOn: '2026-10-31', amount: 10000, concept: '' });
    expect(api['getMovements']).toHaveBeenCalledTimes(1);
  });
});
