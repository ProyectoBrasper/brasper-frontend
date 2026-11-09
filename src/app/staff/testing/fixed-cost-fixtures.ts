import { FixedCost } from '../domain/model/fixed-cost.entity';
import { FixedCostPayment } from '../domain/model/fixed-cost-payment.entity';
import { FixedCostType } from '../domain/model/fixed-cost-type';

/** The 11 fixed costs of DATOS.md §7 (CF-011 inactive). */
export const datosFixedCosts = (): FixedCost[] =>
  [
    [1, FixedCostType.SALARY, 8500, 1],
    [2, FixedCostType.SALARY, 7200, 2],
    [3, FixedCostType.SALARY, 3200, 3],
    [4, FixedCostType.SALARY, 3800, 4],
    [5, FixedCostType.ACCOUNTING, 3500, null],
    [6, FixedCostType.SCTR_INSURANCE, 1150, null],
    [7, FixedCostType.OFFICE_RENT, 4800, null],
    [8, FixedCostType.HOSTING, 420, null],
    [9, FixedCostType.BANK_FEES, 180, null],
    [10, FixedCostType.ITF, 260, null],
    [11, FixedCostType.SALARY, 3400, 5],
  ].map(
    ([id, type, monthlyAmount, employeeId]) =>
      new FixedCost({
        id: id as number,
        code: `CF-${String(id).padStart(3, '0')}`,
        concept: `Costo ${id}`,
        type: type as FixedCostType,
        monthlyAmount: monthlyAmount as number,
        currency: 'PEN',
        employeeId: employeeId as number | null,
        expectedWeeks: [4],
        active: id !== 11,
      }),
  );

export const paymentFixture = (id: number, fixedCostId: number, amount: number, month = 10): FixedCostPayment =>
  new FixedCostPayment({ id, fixedCostId, paidOn: `2026-${String(month).padStart(2, '0')}-02`, year: 2026, month, amount, currency: 'PEN', bankAccountId: 1, notes: '' });

/** October 2026 payments of DATOS.md: everything but CF-009 and CF-010. */
export const datosOctoberPayments = (): FixedCostPayment[] =>
  [
    [1, 8500],
    [2, 7200],
    [3, 3200],
    [4, 3800],
    [5, 3500],
    [6, 1150],
    [7, 4800],
    [8, 420],
  ].map(([costId, amount]) => paymentFixture(costId, costId, amount));
