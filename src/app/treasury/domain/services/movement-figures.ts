import { BankAccount } from '../model/bank-account.entity';
import { CashMovement } from '../model/cash-movement.entity';

const toCents = (amount: number) => Math.round(amount * 100);

/** Movements in date order (the backend does not sort them); same day keeps the order they were registered. */
export function sortMovements(movements: readonly CashMovement[]): CashMovement[] {
  return [...movements].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id - b.id);
}

/** Inflows and outflows of a set of movements, added in cents so they never drift. */
export function movementTotals(movements: readonly CashMovement[]): { inflows: number; outflows: number } {
  let inflows = 0;
  let outflows = 0;
  for (const movement of movements) {
    if (movement.isInflow()) {
      inflows += toCents(movement.amount);
    } else {
      outflows += toCents(movement.amount);
    }
  }
  return { inflows: inflows / 100, outflows: outflows / 100 };
}

/**
 * Accounts that can receive a transfer from `fromAccountId`: any other account in the same currency (the
 * backend rejects the same account and a currency mismatch with 400).
 */
export function transferTargets(accounts: readonly BankAccount[], fromAccountId: number | null): BankAccount[] {
  const from = accounts.find((account) => account.id === fromAccountId);
  return from ? accounts.filter((account) => account.id !== from.id && account.currency === from.currency) : [];
}
