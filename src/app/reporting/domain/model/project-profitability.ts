const toCents = (amount: number) => Math.round(amount * 100);

/** Management view of one project (backend `ProjectProfitabilityResource`). Rates are fractions: 0.72 = 72 %. */
export class ProjectProfitability {
  readonly #projectId: number;
  readonly #code: string;
  readonly #name: string;
  readonly #clientName: string | null;
  readonly #status: string;
  readonly #currency: string;
  readonly #budget: number;
  readonly #estimatedCost: number;
  readonly #actualCost: number;
  readonly #actualCostByCategory: Readonly<Record<string, number>>;
  readonly #costDeviation: number;
  readonly #salesCommission: number;
  readonly #grossProfit: number;
  readonly #margin: number;
  readonly #accumulatedProgress: number;
  readonly #recognizedProfitInPeriod: number;
  readonly #invoiced: number;
  readonly #collected: number;

  constructor(project: {
    projectId: number;
    code: string;
    name: string;
    clientName: string | null;
    status: string;
    currency: string;
    budget: number;
    estimatedCost: number;
    actualCost: number;
    actualCostByCategory: Readonly<Record<string, number>>;
    costDeviation: number;
    salesCommission: number;
    grossProfit: number;
    margin: number;
    accumulatedProgress: number;
    recognizedProfitInPeriod: number;
    invoiced: number;
    collected: number;
  }) {
    this.#projectId = project.projectId;
    this.#code = project.code;
    this.#name = project.name;
    this.#clientName = project.clientName;
    this.#status = project.status;
    this.#currency = project.currency;
    this.#budget = project.budget;
    this.#estimatedCost = project.estimatedCost;
    this.#actualCost = project.actualCost;
    this.#actualCostByCategory = project.actualCostByCategory;
    this.#costDeviation = project.costDeviation;
    this.#salesCommission = project.salesCommission;
    this.#grossProfit = project.grossProfit;
    this.#margin = project.margin;
    this.#accumulatedProgress = project.accumulatedProgress;
    this.#recognizedProfitInPeriod = project.recognizedProfitInPeriod;
    this.#invoiced = project.invoiced;
    this.#collected = project.collected;
  }

  get projectId(): number {
    return this.#projectId;
  }

  get code(): string {
    return this.#code;
  }

  get name(): string {
    return this.#name;
  }

  get clientName(): string | null {
    return this.#clientName;
  }

  get status(): string {
    return this.#status;
  }

  get currency(): string {
    return this.#currency;
  }

  get budget(): number {
    return this.#budget;
  }

  get estimatedCost(): number {
    return this.#estimatedCost;
  }

  get actualCost(): number {
    return this.#actualCost;
  }

  get actualCostByCategory(): Readonly<Record<string, number>> {
    return this.#actualCostByCategory;
  }

  /** Actual minus estimated cost: above zero, it spent more than estimated. */
  get costDeviation(): number {
    return this.#costDeviation;
  }

  get salesCommission(): number {
    return this.#salesCommission;
  }

  /** (Budget − actual cost − commission) × participation: on the whole budget, with the cost spent so far. */
  get grossProfit(): number {
    return this.#grossProfit;
  }

  get margin(): number {
    return this.#margin;
  }

  get accumulatedProgress(): number {
    return this.#accumulatedProgress;
  }

  /** The share of the gross profit earned by the progress of the month asked for. */
  get recognizedProfitInPeriod(): number {
    return this.#recognizedProfitInPeriod;
  }

  get invoiced(): number {
    return this.#invoiced;
  }

  get collected(): number {
    return this.#collected;
  }

  /** Invoiced and not collected yet. */
  outstanding(): number {
    return (toCents(this.#invoiced) - toCents(this.#collected)) / 100;
  }

  /** It spent more than estimated (the same rule as the backend `COST_OVERRUN` alert). */
  isOverEstimate(): boolean {
    return this.#costDeviation > 0;
  }

  /** A quoted or cancelled project has no costs to analyse. */
  isActive(): boolean {
    return this.#status !== 'QUOTED' && this.#status !== 'CANCELLED';
  }
}
