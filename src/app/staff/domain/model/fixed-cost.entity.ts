import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { FixedCostType } from './fixed-cost-type';

/**
 * Recurring monthly cost of the company (salaries, rent, insurance...), backend `FixedCostResource`.
 * `expectedWeeks` (1 to 5) are the weeks of the month it is expected to be paid; they feed the projected
 * cash flow. Code, type and employee never change. Deactivating cannot be undone.
 */
export class FixedCost implements BaseEntity {
  #id: number;
  #code: string;
  #concept: string;
  #type: FixedCostType;
  #monthlyAmount: number;
  #currency: string;
  #employeeId: number | null;
  #expectedWeeks: number[];
  #active: boolean;

  constructor(cost: {
    id: number;
    code: string;
    concept: string;
    type: FixedCostType;
    monthlyAmount: number;
    currency: string;
    employeeId: number | null;
    expectedWeeks: number[];
    active: boolean;
  }) {
    this.#id = cost.id;
    this.#code = cost.code;
    this.#concept = cost.concept;
    this.#type = cost.type;
    this.#monthlyAmount = cost.monthlyAmount;
    this.#currency = cost.currency;
    this.#employeeId = cost.employeeId;
    this.#expectedWeeks = [...cost.expectedWeeks];
    this.#active = cost.active;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get code(): string {
    return this.#code;
  }

  get concept(): string {
    return this.#concept;
  }

  get type(): FixedCostType {
    return this.#type;
  }

  get monthlyAmount(): number {
    return this.#monthlyAmount;
  }

  get currency(): string {
    return this.#currency;
  }

  get employeeId(): number | null {
    return this.#employeeId;
  }

  get expectedWeeks(): number[] {
    return [...this.#expectedWeeks];
  }

  get active(): boolean {
    return this.#active;
  }

  /** An inactive cost cannot be edited or paid (backend 409). */
  isActive(): boolean {
    return this.#active;
  }
}
