/**
 * Data to issue an invoice (backend `IssueInvoiceResource`). The client and every amount are set
 * by the backend from the project and the tax rates in force on `issuedOn`.
 */
export class IssueInvoiceCommand {
  readonly #series: string;
  readonly #correlative: number;
  readonly #issuedOn: string;
  readonly #purchaseOrder: string;
  readonly #projectId: number;
  readonly #taxableBase: number;
  readonly #currency: string;
  readonly #hasRetention: boolean;
  readonly #hasDetraction: boolean;
  readonly #selfDetraction: boolean;
  readonly #advance: boolean;
  readonly #notes: string;

  constructor(command: {
    series: string;
    correlative: number;
    issuedOn: string;
    purchaseOrder: string;
    projectId: number;
    taxableBase: number;
    currency: string;
    hasRetention: boolean;
    hasDetraction: boolean;
    selfDetraction: boolean;
    advance: boolean;
    notes: string;
  }) {
    if (command.selfDetraction && !command.hasDetraction) {
      throw new Error('Self detraction needs a detraction');
    }
    this.#series = command.series;
    this.#correlative = command.correlative;
    this.#issuedOn = command.issuedOn;
    this.#purchaseOrder = command.purchaseOrder;
    this.#projectId = command.projectId;
    this.#taxableBase = command.taxableBase;
    this.#currency = command.currency;
    this.#hasRetention = command.hasRetention;
    this.#hasDetraction = command.hasDetraction;
    this.#selfDetraction = command.selfDetraction;
    this.#advance = command.advance;
    this.#notes = command.notes;
  }

  get series(): string {
    return this.#series;
  }

  get correlative(): number {
    return this.#correlative;
  }

  get issuedOn(): string {
    return this.#issuedOn;
  }

  get purchaseOrder(): string {
    return this.#purchaseOrder;
  }

  get projectId(): number {
    return this.#projectId;
  }

  get taxableBase(): number {
    return this.#taxableBase;
  }

  get currency(): string {
    return this.#currency;
  }

  get hasRetention(): boolean {
    return this.#hasRetention;
  }

  get hasDetraction(): boolean {
    return this.#hasDetraction;
  }

  get selfDetraction(): boolean {
    return this.#selfDetraction;
  }

  get advance(): boolean {
    return this.#advance;
  }

  get notes(): string {
    return this.#notes;
  }
}

/** Number as the backend prints it: series + 8-digit correlative, e.g. F001-00000055. */
export function formatInvoiceNumber(series: string, correlative: number): string {
  return `${series.trim().toUpperCase()}-${String(correlative).padStart(8, '0')}`;
}

/** Next free correlative of a series: highest one already issued + 1 (1 if none). */
export function nextCorrelative(numbers: readonly string[], series: string): number {
  const prefix = `${series.trim().toUpperCase()}-`;
  const used = numbers.filter((n) => n.startsWith(prefix)).map((n) => Number(n.slice(prefix.length)));
  return used.length ? Math.max(...used) + 1 : 1;
}
