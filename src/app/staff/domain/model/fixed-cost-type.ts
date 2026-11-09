/** Kinds of recurring monthly cost (backend `FixedCostType`). A salary always names its employee. */
export enum FixedCostType {
  SALARY = 'SALARY',
  OVERTIME = 'OVERTIME',
  ACCOUNTING = 'ACCOUNTING',
  SCTR_INSURANCE = 'SCTR_INSURANCE',
  LIFE_INSURANCE = 'LIFE_INSURANCE',
  OFFICE_RENT = 'OFFICE_RENT',
  CLEANING = 'CLEANING',
  BANK_FEES = 'BANK_FEES',
  ITF = 'ITF',
  HOSTING = 'HOSTING',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
}

export const FIXED_COST_TYPES: readonly FixedCostType[] = Object.values(FixedCostType);

/** Weeks of a month a payment can be expected in (cash-flow weeks 1 to 5). */
export const CASH_FLOW_WEEKS: readonly number[] = [1, 2, 3, 4, 5];
