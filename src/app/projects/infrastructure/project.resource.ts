import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * JSON of a project (backend `ProjectResource`). On create the backend reads code, name,
 * description, clientId, budget, currency, quotedOn, participation and salesCommissionRate;
 * on update only name, description, budget, participation and salesCommissionRate.
 */
export interface ProjectResource extends BaseResource {
  code: string;
  name: string;
  description: string | null;
  clientId: number;
  budget: number;
  currency: string;
  quotedOn: string;
  status: string;
  participation: number;
  salesCommissionRate: number;
  accumulatedProgress: number;
  estimatedDirectCost: number;
}

/** Envelope for a project collection (the API returns a plain array). */
export interface ProjectsResponse extends BaseResponse {
  projects: ProjectResource[];
}
