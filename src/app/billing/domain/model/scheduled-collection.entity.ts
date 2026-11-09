import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CashFlowWeek } from '../../../shared/domain/model/cash-flow-week';

/** Backend `ScheduleStatus`: scheduled / rescheduled are open; realized / cancelled are closed. */
export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  RESCHEDULED = 'RESCHEDULED',
  REALIZED = 'REALIZED',
  CANCELLED = 'CANCELLED',
}

/**
 * Collection expected from a project in a cash-flow week (`year`, `month`, `week` 1..6).
 * `invoiceId` is set by the backend only when the collection is realized.
 */
export class ScheduledCollection implements BaseEntity {
  #id: number;
  #projectId: number;
  #expectedAmount: number;
  #currency: string;
  #year: number;
  #month: number;
  #week: number;
  #status: ScheduleStatus;
  #invoiceId: number | null;
  #notes: string;

  constructor(collection: {
    id: number;
    projectId: number;
    expectedAmount: number;
    currency: string;
    year: number;
    month: number;
    week: number;
    status: ScheduleStatus;
    invoiceId: number | null;
    notes: string;
  }) {
    this.#id = collection.id;
    this.#projectId = collection.projectId;
    this.#expectedAmount = collection.expectedAmount;
    this.#currency = collection.currency;
    this.#year = collection.year;
    this.#month = collection.month;
    this.#week = collection.week;
    this.#status = collection.status;
    this.#invoiceId = collection.invoiceId;
    this.#notes = collection.notes;
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

  get expectedAmount(): number {
    return this.#expectedAmount;
  }

  get currency(): string {
    return this.#currency;
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

  get status(): ScheduleStatus {
    return this.#status;
  }

  get invoiceId(): number | null {
    return this.#invoiceId;
  }

  get notes(): string {
    return this.#notes;
  }

  get cashFlowWeek(): CashFlowWeek {
    return new CashFlowWeek(this.#year, this.#month, this.#week);
  }

  /** Scheduled or rescheduled: it can still be rescheduled or cancelled (backend rule). */
  isOpen(): boolean {
    return this.#status === ScheduleStatus.SCHEDULED || this.#status === ScheduleStatus.RESCHEDULED;
  }
}
