/** One row of the cash flow (backend `CashFlowConcept`), in the order of the company's Excel. */
export const CASH_FLOW_INFLOWS = ['INVOICE_COLLECTIONS', 'LOANS', 'PARTNER_CONTRIBUTIONS', 'OTHER_INCOME'] as const;
export const CASH_FLOW_OUTFLOWS = [
  'SUPPLIERS',
  'PAYROLL',
  'OFFICE_RENT',
  'CLEANING',
  'INSURANCE',
  'TAXES',
  'PENDING_PAYABLES',
  'LOAN_REPAYMENTS',
  'OTHER_EXPENSES',
] as const;

/** Amount per concept; a concept without movement is absent. */
export type CashFlowAmounts = Readonly<Record<string, number>>;

/** One week of the cash flow, in PEN (backend `CashFlowReportResource.Line`). The backend calculates every figure. */
export class CashFlowLine {
  readonly #startDate: string;
  readonly #endDate: string;
  readonly #projected: boolean;
  readonly #openingBalance: number;
  readonly #inflows: CashFlowAmounts;
  readonly #outflows: CashFlowAmounts;
  readonly #totalInflows: number;
  readonly #totalOutflows: number;
  readonly #netFlow: number;
  readonly #closingBalance: number;

  constructor(line: {
    startDate: string;
    endDate: string;
    projected: boolean;
    openingBalance: number;
    inflows: CashFlowAmounts;
    outflows: CashFlowAmounts;
    totalInflows: number;
    totalOutflows: number;
    netFlow: number;
    closingBalance: number;
  }) {
    this.#startDate = line.startDate;
    this.#endDate = line.endDate;
    this.#projected = line.projected;
    this.#openingBalance = line.openingBalance;
    this.#inflows = line.inflows;
    this.#outflows = line.outflows;
    this.#totalInflows = line.totalInflows;
    this.#totalOutflows = line.totalOutflows;
    this.#netFlow = line.netFlow;
    this.#closingBalance = line.closingBalance;
  }

  /** `yyyy-MM-dd`. */
  get startDate(): string {
    return this.#startDate;
  }

  /** `yyyy-MM-dd`. */
  get endDate(): string {
    return this.#endDate;
  }

  /** True from the week of today on, even though that week also holds what already happened. */
  get projected(): boolean {
    return this.#projected;
  }

  get openingBalance(): number {
    return this.#openingBalance;
  }

  get inflows(): CashFlowAmounts {
    return this.#inflows;
  }

  get outflows(): CashFlowAmounts {
    return this.#outflows;
  }

  get totalInflows(): number {
    return this.#totalInflows;
  }

  get totalOutflows(): number {
    return this.#totalOutflows;
  }

  get netFlow(): number {
    return this.#netFlow;
  }

  get closingBalance(): number {
    return this.#closingBalance;
  }
}

/** The cash flow of a range (backend `CashFlowReportResource`): each line opens with the closing of the one before. */
export class CashFlowReport {
  readonly #from: string;
  readonly #to: string;
  readonly #finalBalance: number;
  readonly #hasNegativeBalance: boolean;
  readonly #lines: CashFlowLine[];

  constructor(report: { from: string; to: string; finalBalance: number; hasNegativeBalance: boolean; lines: CashFlowLine[] }) {
    this.#from = report.from;
    this.#to = report.to;
    this.#finalBalance = report.finalBalance;
    this.#hasNegativeBalance = report.hasNegativeBalance;
    this.#lines = report.lines;
  }

  /** `yyyy-MM-dd`. */
  get from(): string {
    return this.#from;
  }

  /** `yyyy-MM-dd`. */
  get to(): string {
    return this.#to;
  }

  get finalBalance(): number {
    return this.#finalBalance;
  }

  get hasNegativeBalance(): boolean {
    return this.#hasNegativeBalance;
  }

  get lines(): CashFlowLine[] {
    return this.#lines;
  }
}
