import { MovementDirection } from './cash-movement.entity';

/**
 * Moves money between two accounts of the same currency (backend `TransferFundsResource`): an outflow in the
 * origin and an inflow in the destination. The amount is in the origin currency.
 */
export interface TransferFundsCommand {
  fromAccountId: number;
  toAccountId: number;
  transferredOn: string;
  amount: number;
  concept: string;
}

/** Corrects a balance by hand with a movement in the account currency (backend `RegisterAdjustmentResource`). */
export interface RegisterAdjustmentCommand {
  occurredOn: string;
  direction: MovementDirection;
  amount: number;
  concept: string;
}
