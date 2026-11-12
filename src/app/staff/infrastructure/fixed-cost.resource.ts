import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of a fixed cost (backend `FixedCostResource`). */
export interface FixedCostResource extends BaseResource {
  code: string;
  concept: string;
  type: string;
  monthlyAmount: number;
  currency: string;
  employeeId: number | null;
  expectedWeeks: number[];
  active: boolean;
}

/** Body of `POST /fixed-costs` (backend `CreateFixedCostResource`). */
export interface CreateFixedCostRequest {
  code: string;
  concept: string;
  type: string;
  monthlyAmount: number;
  currency: string;
  employeeId: number | null;
  expectedWeeks: number[];
}

/** Body of `PUT /fixed-costs/{id}` (backend `UpdateFixedCostResource`). */
export interface UpdateFixedCostRequest {
  concept: string;
  monthlyAmount: number;
  expectedWeeks: number[];
}

/** JSON of a fixed cost payment (backend `FixedCostPaymentResource`). */
export interface FixedCostPaymentResource extends BaseResource {
  fixedCostId: number;
  paidOn: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
  bankAccountId: number | null;
  notes: string | null;
}

/** Body of `POST /fixed-costs/{id}/payments` (backend `RegisterFixedCostPaymentResource`). */
export interface RegisterFixedCostPaymentRequest {
  paidOn: string;
  year: number;
  month: number;
  amount: number;
  bankAccountId: number | null;
  notes: string | null;
}

/** Envelope for a fixed cost collection (the API returns a plain array). */
export interface FixedCostsResponse extends BaseResponse {
  fixedCosts: FixedCostResource[];
}
