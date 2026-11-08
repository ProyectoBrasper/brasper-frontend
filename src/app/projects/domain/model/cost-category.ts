/**
 * Direct cost categories (backend `CostCategory`). A project has at most one estimate per category.
 */
export enum CostCategory {
  MATERIALS = 'MATERIALS',
  LABOR = 'LABOR',
  TRAVEL_EXPENSES = 'TRAVEL_EXPENSES',
  OTHER = 'OTHER',
}

/** All categories, in display order. */
export const COST_CATEGORIES: readonly CostCategory[] = Object.values(CostCategory);
