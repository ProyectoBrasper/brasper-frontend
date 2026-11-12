import { FixedCost } from '../model/fixed-cost.entity';
import { FixedCostPayment } from '../model/fixed-cost-payment.entity';
import { FixedCostType } from '../model/fixed-cost-type';
import { nextCostCode, paidFor, pendingFor, salaryConcept, sumAmounts } from './fixed-cost-figures';

const cost = (id: number, monthlyAmount: number) =>
  new FixedCost({ id, code: `CF-00${id}`, concept: 'x', type: FixedCostType.BANK_FEES, monthlyAmount, currency: 'PEN', employeeId: null, expectedWeeks: [4], active: true });
const payment = (id: number, fixedCostId: number, amount: number) =>
  new FixedCostPayment({ id, fixedCostId, paidOn: '2026-10-09', year: 2026, month: 10, amount, currency: 'PEN', bankAccountId: 1, notes: '' });

describe('fixed cost figures', () => {
  const payments = [payment(1, 8, 420), payment(2, 1, 4000), payment(3, 1, 4500.1)];

  it('adds what was paid for one cost in the month', () => {
    expect(paidFor(1, payments)).toBe(8500.1);
    expect(paidFor(9, payments)).toBe(0);
  });

  it('owes the monthly amount minus what was paid, never less than zero', () => {
    expect(pendingFor(cost(9, 180), payments)).toBe(180);
    expect(pendingFor(cost(8, 420), payments)).toBe(0);
    expect(pendingFor(cost(1, 8500), payments)).toBe(0);
  });

  it('adds totals in cents', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([22700, 3500, 1150, 4800, 420])).toBe(32570);
  });

  it('proposes the next CF code, ignoring codes with another format', () => {
    expect(nextCostCode(['CF-001', 'CF-011', 'OTRO-99', 'cf-002'])).toBe('CF-012');
    expect(nextCostCode([])).toBe('CF-001');
    expect(nextCostCode(['CF-999'])).toBe('CF-1000');
  });

  it('proposes "Sueldo — first name and first surname" for a salary', () => {
    expect(salaryConcept('Andrea Salazar Ponce')).toBe('Sueldo — Andrea Salazar');
    expect(salaryConcept('  Rosa  Díaz Campos ')).toBe('Sueldo — Rosa Díaz');
    expect(salaryConcept('Carla Mendoza Rojas', 'Salary')).toBe('Salary — Carla Mendoza');
  });
});
