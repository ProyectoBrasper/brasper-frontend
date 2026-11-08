import { BaseResource } from '../../shared/infrastructure/base-resource';

/** Backend `ProgressRecordResource` (no projectId: it is in the URL). `percentage` is a fraction. */
export interface ProgressRecordResource extends BaseResource {
  year: number;
  month: number;
  percentage: number;
}

/** Body of `POST /projects/{id}/progress` (backend `RegisterProgressResource`). */
export interface RegisterProgressRequest {
  year: number;
  month: number;
  percentage: number;
}

/** Backend `CostEstimateResource` (no projectId: it is in the URL). */
export interface CostEstimateResource extends BaseResource {
  category: string;
  estimatedAmount: number;
}

/** Body of `PUT /projects/{id}/cost-estimates` (backend `SetCostEstimateResource`); creates or replaces by category. */
export interface SetCostEstimateRequest {
  category: string;
  estimatedAmount: number;
  currency: string;
}
