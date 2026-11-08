import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { Period } from '../../../shared/domain/model/period';

/**
 * Progress earned by a project in one month. `percentage` is a fraction (0.08 = 8 %).
 */
export class ProgressRecord implements BaseEntity {
  #id: number;
  #projectId: number;
  #year: number;
  #month: number;
  #percentage: number;

  constructor(record: { id: number; projectId: number; year: number; month: number; percentage: number }) {
    this.#id = record.id;
    this.#projectId = record.projectId;
    this.#year = record.year;
    this.#month = record.month;
    this.#percentage = record.percentage;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get projectId(): number {
    return this.#projectId;
  }

  set projectId(value: number) {
    this.#projectId = value;
  }

  get year(): number {
    return this.#year;
  }

  set year(value: number) {
    this.#year = value;
  }

  get month(): number {
    return this.#month;
  }

  set month(value: number) {
    this.#month = value;
  }

  get percentage(): number {
    return this.#percentage;
  }

  set percentage(value: number) {
    this.#percentage = value;
  }

  get period(): Period {
    return new Period(this.#year, this.#month);
  }

  /** Sort key: chronological order. */
  get periodKey(): number {
    return this.#year * 100 + this.#month;
  }
}
