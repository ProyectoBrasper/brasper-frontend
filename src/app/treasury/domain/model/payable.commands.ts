import { CashFlowWeek } from '../../../shared/domain/model/cash-flow-week';
import { PayableType } from './payable.entity';

/**
 * A payment of a payable (backend `RegisterPayablePaymentResource`): the account is required and the amount can
 * not exceed the balance. It posts a cash outflow in that account.
 */
export interface RegisterPayablePaymentCommand {
  paidOn: string;
  amount: number;
  bankAccountId: number;
}

/**
 * A payable registered by hand (backend `CreatePayableResource`). Accounting books its cost (direct cost with a
 * project, services without one) unless it is a tax or a self detraction, so a purchase already registered as a
 * pending expense must not be entered here too: that expense already created its payable. The expense link is
 * never set by hand.
 */
export interface CreatePayableCommand {
  concept: string;
  type: PayableType;
  totalAmount: number;
  currency: string;
  supplierId: number | null;
  projectId: number | null;
  week: CashFlowWeek;
}
