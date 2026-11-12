/** The manager's summary of a month, in PEN (backend `DashboardResource`). */
export class Dashboard {
  readonly #cashBalance: number;
  readonly #receivablesOutstanding: number;
  readonly #payablesOutstanding: number;
  readonly #netProfitYtd: number;
  readonly #projectedClosingBalance: number;
  readonly #projectsInProgress: number;
  readonly #alerts: string[];

  constructor(dashboard: {
    cashBalance: number;
    receivablesOutstanding: number;
    payablesOutstanding: number;
    netProfitYtd: number;
    projectedClosingBalance: number;
    projectsInProgress: number;
    alerts: string[];
  }) {
    this.#cashBalance = dashboard.cashBalance;
    this.#receivablesOutstanding = dashboard.receivablesOutstanding;
    this.#payablesOutstanding = dashboard.payablesOutstanding;
    this.#netProfitYtd = dashboard.netProfitYtd;
    this.#projectedClosingBalance = dashboard.projectedClosingBalance;
    this.#projectsInProgress = dashboard.projectsInProgress;
    this.#alerts = dashboard.alerts;
  }

  /** At the end of the month, or today when it has not ended. */
  get cashBalance(): number {
    return this.#cashBalance;
  }

  /** At the end of the month, or today when it has not ended. */
  get receivablesOutstanding(): number {
    return this.#receivablesOutstanding;
  }

  /** Always today: payables have no history to ask for another date. */
  get payablesOutstanding(): number {
    return this.#payablesOutstanding;
  }

  /** From January to the month asked for. */
  get netProfitYtd(): number {
    return this.#netProfitYtd;
  }

  /** The closing balance of the last week of the month. */
  get projectedClosingBalance(): number {
    return this.#projectedClosingBalance;
  }

  /** Always today. */
  get projectsInProgress(): number {
    return this.#projectsInProgress;
  }

  /** Codes such as `NEGATIVE_PROJECTED_BALANCE` or `COST_OVERRUN:<project code>`. */
  get alerts(): string[] {
    return this.#alerts;
  }
}
