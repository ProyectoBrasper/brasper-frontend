import { CostCategory } from '../domain/model/cost-category';
import { CostEstimate } from '../domain/model/cost-estimate.entity';
import { ProgressRecord } from '../domain/model/progress-record.entity';
import {
  CostEstimateResource,
  ProgressRecordResource,
  RegisterProgressRequest,
  SetCostEstimateRequest,
} from './project-detail.resources';

/**
 * Maps progress records. The project id comes from the URL, so it is passed in.
 */
export class ProgressRecordAssembler {
  toEntityFromResource(resource: ProgressRecordResource, projectId: number): ProgressRecord {
    return new ProgressRecord({
      id: resource.id,
      projectId,
      year: resource.year,
      month: resource.month,
      percentage: Number(resource.percentage),
    });
  }

  toRequestFromEntity(entity: ProgressRecord): RegisterProgressRequest {
    return { year: entity.year, month: entity.month, percentage: entity.percentage };
  }
}

/**
 * Maps cost estimates. The project id comes from the URL; the currency must be the project's.
 */
export class CostEstimateAssembler {
  toEntityFromResource(resource: CostEstimateResource, projectId: number): CostEstimate {
    return new CostEstimate({
      id: resource.id,
      projectId,
      category: resource.category as CostCategory,
      estimatedAmount: Number(resource.estimatedAmount),
    });
  }

  toRequestFromEntity(entity: CostEstimate, currency: string): SetCostEstimateRequest {
    return { category: entity.category, estimatedAmount: entity.estimatedAmount, currency };
  }
}
