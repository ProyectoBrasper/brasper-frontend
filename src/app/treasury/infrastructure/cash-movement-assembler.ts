import { BaseResource } from '../../shared/infrastructure/base-resource';
import { CashMovement, MovementDirection, MovementSource } from '../domain/model/cash-movement.entity';

/** Backend `CashMovementResource` (the currency is the account's). */
export interface CashMovementResource extends BaseResource {
  occurredOn: string;
  direction: string;
  amount: number;
  concept: string | null;
  source: string;
  sourceId: number | null;
}

/** Body of `POST /bank-accounts/{id}/adjustments` (backend `RegisterAdjustmentResource`). */
export interface RegisterAdjustmentRequest {
  occurredOn: string;
  direction: string;
  amount: number;
  concept: string | null;
}

/** Body of `POST /bank-accounts/transfers` (backend `TransferFundsResource`). */
export interface TransferFundsRequest {
  fromAccountId: number;
  toAccountId: number;
  transferredOn: string;
  amount: number;
  concept: string | null;
}

/** Maps cash movements from their resource; a missing concept becomes an empty string. */
export class CashMovementAssembler {
  toEntityFromResource(resource: CashMovementResource): CashMovement {
    return new CashMovement({
      id: resource.id,
      occurredOn: resource.occurredOn,
      direction: resource.direction as MovementDirection,
      amount: Number(resource.amount),
      concept: resource.concept ?? '',
      source: resource.source as MovementSource,
      sourceId: resource.sourceId ?? null,
    });
  }
}
