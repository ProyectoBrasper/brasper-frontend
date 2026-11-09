import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { FixedCost } from '../domain/model/fixed-cost.entity';
import { FixedCostPayment } from '../domain/model/fixed-cost-payment.entity';
import { FixedCostType } from '../domain/model/fixed-cost-type';
import { FixedCostPaymentResource, FixedCostResource, FixedCostsResponse } from './fixed-cost.resource';

/**
 * Maps fixed costs from their resource (`Number()` covers BigDecimal sent as a string). They are never
 * sent whole: creating and updating use their own requests.
 */
export class FixedCostAssembler implements BaseAssembler<FixedCost, FixedCostResource, FixedCostsResponse> {
  toEntitiesFromResponse(response: FixedCostsResponse): FixedCost[] {
    return response.fixedCosts.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: FixedCostResource): FixedCost {
    return new FixedCost({
      id: resource.id,
      code: resource.code,
      concept: resource.concept,
      type: resource.type as FixedCostType,
      monthlyAmount: Number(resource.monthlyAmount),
      currency: resource.currency,
      employeeId: resource.employeeId ?? null,
      expectedWeeks: [...(resource.expectedWeeks ?? [])].sort((a, b) => a - b),
      active: resource.active,
    });
  }

  toResourceFromEntity(entity: FixedCost): FixedCostResource {
    return {
      id: entity.id,
      code: entity.code,
      concept: entity.concept,
      type: entity.type,
      monthlyAmount: entity.monthlyAmount,
      currency: entity.currency,
      employeeId: entity.employeeId,
      expectedWeeks: entity.expectedWeeks,
      active: entity.active,
    };
  }
}

/** Maps fixed cost payments from their resource; a missing note becomes an empty string. */
export class FixedCostPaymentAssembler {
  toEntityFromResource(resource: FixedCostPaymentResource): FixedCostPayment {
    return new FixedCostPayment({
      id: resource.id,
      fixedCostId: resource.fixedCostId,
      paidOn: resource.paidOn,
      year: resource.year,
      month: resource.month,
      amount: Number(resource.amount),
      currency: resource.currency,
      bankAccountId: resource.bankAccountId ?? null,
      notes: resource.notes ?? '',
    });
  }
}
