import { CostCategory } from '../../../projects/domain/model/cost-category';
import { PaymentMethod } from './payment-method';
import { VoucherType } from './voucher-type';

/**
 * Data to register an expense (backend `RegisterExpenseResource`). The backend calculates base, IGV and
 * total: `amount` is the base, or the total when `amountIncludesIgv` (only meaningful for an invoice).
 * `paid` false leaves a payable for Treasury. `projectId` null = general expense.
 */
export interface RegisterExpenseCommand {
  spentOn: string;
  projectId: number | null;
  supplierId: number | null;
  category: CostCategory;
  description: string;
  voucherType: VoucherType;
  voucherNumber: string;
  amount: number;
  amountIncludesIgv: boolean;
  currency: string;
  paymentMethod: PaymentMethod;
  bankAccountId: number | null;
  partnerId: number | null;
  paid: boolean;
}

/** What can change after registering (backend `CorrectExpenseResource`): it replaces all three fields. */
export interface CorrectExpenseCommand {
  projectId: number | null;
  category: CostCategory;
  description: string;
}
