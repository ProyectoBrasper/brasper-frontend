import { FixedCostType } from './fixed-cost-type';

/** Data to create a fixed cost (backend `CreateFixedCostResource`). A salary needs `employeeId`. */
export interface CreateFixedCostCommand {
  code: string;
  concept: string;
  type: FixedCostType;
  monthlyAmount: number;
  currency: string;
  employeeId: number | null;
  expectedWeeks: number[];
}

/** What can change afterwards (backend `UpdateFixedCostResource`): concept, amount and weeks. */
export interface UpdateFixedCostCommand {
  concept: string;
  monthlyAmount: number;
  expectedWeeks: number[];
}

/** A payment for the month `year`/`month` (backend `RegisterFixedCostPaymentResource`). */
export interface RegisterFixedCostPaymentCommand {
  paidOn: string;
  year: number;
  month: number;
  amount: number;
  bankAccountId: number | null;
  notes: string;
}
