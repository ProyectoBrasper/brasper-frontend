import { BankAccount, BankAccountType } from '../model/bank-account.entity';
import { CashMovement, MovementDirection, MovementSource } from '../model/cash-movement.entity';
import { movementTotals, sortMovements, transferTargets } from './movement-figures';

const movement = (id: number, occurredOn: string, direction: MovementDirection, amount: number) =>
  new CashMovement({ id, occurredOn, direction, amount, concept: '', source: MovementSource.ADJUSTMENT, sourceId: null });

const account = (id: number, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `0${id}`, type: BankAccountType.CHECKING, currency, openingBalance: 0, currentBalance: 0 });

const { INFLOW, OUTFLOW } = MovementDirection;

describe('movement figures', () => {
  it('sorts by date and, on the same day, by registration order', () => {
    const sorted = sortMovements([
      movement(9, '2026-10-31', OUTFLOW, 1),
      movement(4, '2026-10-02', OUTFLOW, 1),
      movement(2, '2026-10-02', OUTFLOW, 1),
      movement(7, '2026-10-06', INFLOW, 1),
    ]);
    expect(sorted.map((m) => m.id)).toEqual([2, 4, 7, 9]);
  });

  it('adds the BCP October movements of DATOS.md (in 60,000 / out 216,200)', () => {
    const october = [
      movement(1, '2026-10-02', OUTFLOW, 141600),
      movement(2, '2026-10-02', OUTFLOW, 3500),
      movement(3, '2026-10-02', OUTFLOW, 4800),
      movement(4, '2026-10-06', INFLOW, 60000),
      movement(5, '2026-10-09', OUTFLOW, 1150),
      movement(6, '2026-10-14', OUTFLOW, 22450),
      movement(7, '2026-10-15', OUTFLOW, 20000),
      movement(8, '2026-10-31', OUTFLOW, 8500),
      movement(9, '2026-10-31', OUTFLOW, 7200),
      movement(10, '2026-10-31', OUTFLOW, 3200),
      movement(11, '2026-10-31', OUTFLOW, 3800),
    ];
    expect(movementTotals(october)).toEqual({ inflows: 60000, outflows: 216200 });
  });

  it('adds in cents and is zero without movements', () => {
    expect(movementTotals([movement(1, '2026-10-01', INFLOW, 0.1), movement(2, '2026-10-01', INFLOW, 0.2)])).toEqual({
      inflows: 0.3,
      outflows: 0,
    });
    expect(movementTotals([])).toEqual({ inflows: 0, outflows: 0 });
  });

  it('offers as destination every other account in the same currency', () => {
    const accounts = [account(1), account(2), account(3, 'USD'), account(4)];
    expect(transferTargets(accounts, 1).map((a) => a.id)).toEqual([2, 4]);
    expect(transferTargets(accounts, 3)).toEqual([]);
    expect(transferTargets(accounts, null)).toEqual([]);
  });
});
