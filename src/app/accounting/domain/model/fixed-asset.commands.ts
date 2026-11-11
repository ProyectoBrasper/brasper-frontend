/**
 * Registers an asset (backend `RegisterFixedAssetResource`). Only the base travels: the backend calculates the IGV with
 * the rate in force on `acquiredOn`. With `expenseId` the asset takes over the cost of that expense; without it, it is
 * an asset the company already owned and is posted against retained earnings.
 */
export interface RegisterFixedAssetCommand {
  description: string;
  acquiredOn: string;
  taxableBase: number;
  currency: string;
  usefulLifeMonths: number;
  expenseId: number | null;
}
