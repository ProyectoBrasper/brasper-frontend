import { FixedCost } from '../model/fixed-cost.entity';
import { FixedCostPayment } from '../model/fixed-cost-payment.entity';

const toCents = (amount: number) => Math.round(amount * 100);

/** What was paid for a cost among the payments of one month (backend `FixedCost.paidIn`). */
export function paidFor(fixedCostId: number, payments: readonly FixedCostPayment[]): number {
  return payments.filter((p) => p.fixedCostId === fixedCostId).reduce((sum, p) => sum + toCents(p.amount), 0) / 100;
}

/** What is still owed for the month, never negative (backend `FixedCost.pendingIn`). */
export function pendingFor(cost: FixedCost, payments: readonly FixedCostPayment[]): number {
  return Math.max(0, toCents(cost.monthlyAmount) - toCents(paidFor(cost.id, payments))) / 100;
}

/** Sum of amounts in cents, so totals never drift. */
export function sumAmounts(amounts: readonly number[]): number {
  return amounts.reduce((sum, amount) => sum + toCents(amount), 0) / 100;
}

/**
 * Next code following the `CF-001` convention (DATOS.md): highest `CF-<n>` + 1, padded to 3 digits.
 * The user can still type any other code (the backend only requires 1 to 30 characters, unique).
 */
export function nextCostCode(codes: readonly string[]): string {
  const numbers = codes.map((code) => /^CF-(\d+)$/i.exec(code.trim())).filter((m) => m !== null).map((m) => Number(m![1]));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `CF-${String(next).padStart(3, '0')}`;
}

/** Concept proposed for a salary, like DATOS.md: "Sueldo — Carla Mendoza" (first name and first surname). */
export function salaryConcept(fullName: string, prefix = 'Sueldo'): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return `${prefix} — ${words.slice(0, 2).join(' ')}`;
}
