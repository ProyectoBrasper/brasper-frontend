import { BaseEntity } from '../../../shared/domain/model/base-entity';

/** Whether money came into the account or left it (backend `MovementDirection`). */
export enum MovementDirection {
  INFLOW = 'INFLOW',
  OUTFLOW = 'OUTFLOW',
}

export const MOVEMENT_DIRECTIONS: readonly MovementDirection[] = Object.values(MovementDirection);

/** What produced a movement (backend `MovementSource`); only ADJUSTMENT and TRANSFER are typed by hand. */
export enum MovementSource {
  OPENING_BALANCE = 'OPENING_BALANCE',
  INVOICE_PAYMENT = 'INVOICE_PAYMENT',
  EXPENSE = 'EXPENSE',
  FIXED_COST_PAYMENT = 'FIXED_COST_PAYMENT',
  PAYABLE_PAYMENT = 'PAYABLE_PAYMENT',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_INSTALLMENT = 'LOAN_INSTALLMENT',
  PARTNER_CONTRIBUTION = 'PARTNER_CONTRIBUTION',
  TAX_PAYMENT = 'TAX_PAYMENT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Money in or out of a bank account (backend `CashMovementResource`). The amount is always positive; the
 * direction says which way it went. `sourceId` points to what produced it (the payment, the counterpart
 * account of a transfer...). Movements are never edited: a mistake is fixed with an adjustment.
 */
export class CashMovement implements BaseEntity {
  #id: number;
  #occurredOn: string;
  #direction: MovementDirection;
  #amount: number;
  #concept: string;
  #source: MovementSource;
  #sourceId: number | null;

  constructor(movement: {
    id: number;
    occurredOn: string;
    direction: MovementDirection;
    amount: number;
    concept: string;
    source: MovementSource;
    sourceId: number | null;
  }) {
    this.#id = movement.id;
    this.#occurredOn = movement.occurredOn;
    this.#direction = movement.direction;
    this.#amount = movement.amount;
    this.#concept = movement.concept;
    this.#source = movement.source;
    this.#sourceId = movement.sourceId;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get occurredOn(): string {
    return this.#occurredOn;
  }

  get direction(): MovementDirection {
    return this.#direction;
  }

  get amount(): number {
    return this.#amount;
  }

  get concept(): string {
    return this.#concept;
  }

  get source(): MovementSource {
    return this.#source;
  }

  get sourceId(): number | null {
    return this.#sourceId;
  }

  isInflow(): boolean {
    return this.#direction === MovementDirection.INFLOW;
  }
}
