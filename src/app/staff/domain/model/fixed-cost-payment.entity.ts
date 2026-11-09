import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * Payment of a fixed cost for a month (`year`/`month`), backend `FixedCostPaymentResource`. Without a
 * bank account no cash movement is posted in Treasury.
 */
export class FixedCostPayment implements BaseEntity {
  #id: number;
  #fixedCostId: number;
  #paidOn: string;
  #year: number;
  #month: number;
  #amount: number;
  #currency: string;
  #bankAccountId: number | null;
  #notes: string;

  constructor(payment: {
    id: number;
    fixedCostId: number;
    paidOn: string;
    year: number;
    month: number;
    amount: number;
    currency: string;
    bankAccountId: number | null;
    notes: string;
  }) {
    this.#id = payment.id;
    this.#fixedCostId = payment.fixedCostId;
    this.#paidOn = payment.paidOn;
    this.#year = payment.year;
    this.#month = payment.month;
    this.#amount = payment.amount;
    this.#currency = payment.currency;
    this.#bankAccountId = payment.bankAccountId;
    this.#notes = payment.notes;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get fixedCostId(): number {
    return this.#fixedCostId;
  }

  get paidOn(): string {
    return this.#paidOn;
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get amount(): number {
    return this.#amount;
  }

  get currency(): string {
    return this.#currency;
  }

  get bankAccountId(): number | null {
    return this.#bankAccountId;
  }

  get notes(): string {
    return this.#notes;
  }
}
