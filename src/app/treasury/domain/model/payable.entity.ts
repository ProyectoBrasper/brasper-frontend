import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CashFlowWeek } from '../../../shared/domain/model/cash-flow-week';
import { PaymentStatus } from '../../../shared/domain/model/payment-status';

/** What a payable is for (backend `PayableType`). */
export enum PayableType {
  SUPPLIER = 'SUPPLIER',
  TECHNICIAN = 'TECHNICIAN',
  ACCOUNTING = 'ACCOUNTING',
  SELF_DETRACTION = 'SELF_DETRACTION',
  TAX = 'TAX',
  OTHER = 'OTHER',
}

export const PAYABLE_TYPES: readonly PayableType[] = Object.values(PayableType);

/**
 * Money the company owes, scheduled in a cash-flow week (backend `PayableResource`). Paid and balance come from
 * the backend; it does not expose the individual payments. A pending expense creates its payable by itself, and
 * settling it marks the expense as paid.
 */
export class Payable implements BaseEntity {
  #id: number;
  #concept: string;
  #type: PayableType;
  #totalAmount: number;
  #currency: string;
  #paidAmount: number;
  #balance: number;
  #supplierId: number | null;
  #projectId: number | null;
  #expenseId: number | null;
  #year: number;
  #month: number;
  #week: number;
  #status: PaymentStatus;

  constructor(payable: {
    id: number;
    concept: string;
    type: PayableType;
    totalAmount: number;
    currency: string;
    paidAmount: number;
    balance: number;
    supplierId: number | null;
    projectId: number | null;
    expenseId: number | null;
    year: number;
    month: number;
    week: number;
    status: PaymentStatus;
  }) {
    this.#id = payable.id;
    this.#concept = payable.concept;
    this.#type = payable.type;
    this.#totalAmount = payable.totalAmount;
    this.#currency = payable.currency;
    this.#paidAmount = payable.paidAmount;
    this.#balance = payable.balance;
    this.#supplierId = payable.supplierId;
    this.#projectId = payable.projectId;
    this.#expenseId = payable.expenseId;
    this.#year = payable.year;
    this.#month = payable.month;
    this.#week = payable.week;
    this.#status = payable.status;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get concept(): string {
    return this.#concept;
  }

  get type(): PayableType {
    return this.#type;
  }

  get totalAmount(): number {
    return this.#totalAmount;
  }

  get currency(): string {
    return this.#currency;
  }

  get paidAmount(): number {
    return this.#paidAmount;
  }

  get balance(): number {
    return this.#balance;
  }

  get supplierId(): number | null {
    return this.#supplierId;
  }

  get projectId(): number | null {
    return this.#projectId;
  }

  get expenseId(): number | null {
    return this.#expenseId;
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get week(): number {
    return this.#week;
  }

  get status(): PaymentStatus {
    return this.#status;
  }

  /** A paid payable cannot be paid or rescheduled again (backend 409). */
  isPaid(): boolean {
    return this.#status === PaymentStatus.PAID;
  }

  /** The cash-flow week it is scheduled in. */
  cashFlowWeek(): CashFlowWeek {
    return new CashFlowWeek(this.#year, this.#month, this.#week);
  }
}
