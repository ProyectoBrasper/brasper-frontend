import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * Tax rates in force from a date (backend `TaxParameters`). Rates are fractions: 0.18 = 18 %.
 */
export class TaxParameters implements BaseEntity {
  #id: number;
  #igv: number;
  #detraction: number;
  #retention: number;
  #incomeTaxPrepayment: number;
  #effectiveFrom: string;

  constructor(parameters: {
    id: number;
    igv: number;
    detraction: number;
    retention: number;
    incomeTaxPrepayment: number;
    effectiveFrom: string;
  }) {
    this.#id = parameters.id;
    this.#igv = parameters.igv;
    this.#detraction = parameters.detraction;
    this.#retention = parameters.retention;
    this.#incomeTaxPrepayment = parameters.incomeTaxPrepayment;
    this.#effectiveFrom = parameters.effectiveFrom;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get igv(): number {
    return this.#igv;
  }

  get detraction(): number {
    return this.#detraction;
  }

  get retention(): number {
    return this.#retention;
  }

  get incomeTaxPrepayment(): number {
    return this.#incomeTaxPrepayment;
  }

  /** `yyyy-MM-dd`. */
  get effectiveFrom(): string {
    return this.#effectiveFrom;
  }
}
