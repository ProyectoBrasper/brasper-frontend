import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of an expense (backend `ExpenseResource`). Amounts are calculated by the backend. */
export interface ExpenseResource extends BaseResource {
  spentOn: string;
  projectId: number | null;
  supplierId: number | null;
  category: string;
  description: string | null;
  voucherType: string;
  voucherNumber: string | null;
  taxableBase: number;
  igv: number;
  total: number;
  currency: string;
  paymentMethod: string;
  bankAccountId: number | null;
  partnerId: number | null;
  paymentStatus: string;
  annulled: boolean;
}

/** Body of `POST /expenses` (backend `RegisterExpenseResource`). */
export interface RegisterExpenseRequest {
  spentOn: string;
  projectId: number | null;
  supplierId: number | null;
  category: string;
  description: string | null;
  voucherType: string;
  voucherNumber: string | null;
  amount: number;
  amountIncludesIgv: boolean;
  currency: string;
  paymentMethod: string;
  bankAccountId: number | null;
  partnerId: number | null;
  paid: boolean;
}

/** Body of `PUT /expenses/{id}` (backend `CorrectExpenseResource`). */
export interface CorrectExpenseRequest {
  projectId: number | null;
  category: string;
  description: string | null;
}

/** Envelope for an expense collection (the API returns a plain array). */
export interface ExpensesResponse extends BaseResponse {
  expenses: ExpenseResource[];
}
