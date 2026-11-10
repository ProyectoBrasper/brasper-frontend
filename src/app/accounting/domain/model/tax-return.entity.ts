import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { Period } from '../../../shared/domain/model/period';

/** Life of a tax return (backend `TaxReturnStatus`): prepared as a draft, filed and paid in one step when paid. */
export enum TaxReturnStatus {
  DRAFT = 'DRAFT',
  FILED = 'FILED',
  PAID = 'PAID',
}

/**
 * The monthly IGV and income tax prepayment return (backend `TaxReturnResource`). The backend computes every figure
 * when it is prepared, from the journal of the month (output and input IGV on 40111, sales on 70) and the credit the
 * previous month left; they stay fixed afterwards. IGV payable = output − input − carried credit (never below zero).
 */
export class TaxReturn implements BaseEntity {
  #id: number;
  #year: number;
  #month: number;
  #outputIgv: number;
  #inputIgv: number;
  #carriedCredit: number;
  #igvPayable: number;
  #incomeTaxPrepayment: number;
  #totalPayable: number;
  #currency: string;
  #status: TaxReturnStatus;
  #paidOn: string | null;
  #bankAccountId: number | null;

  constructor(taxReturn: {
    id: number;
    year: number;
    month: number;
    outputIgv: number;
    inputIgv: number;
    carriedCredit: number;
    igvPayable: number;
    incomeTaxPrepayment: number;
    totalPayable: number;
    currency: string;
    status: TaxReturnStatus;
    paidOn: string | null;
    bankAccountId: number | null;
  }) {
    this.#id = taxReturn.id;
    this.#year = taxReturn.year;
    this.#month = taxReturn.month;
    this.#outputIgv = taxReturn.outputIgv;
    this.#inputIgv = taxReturn.inputIgv;
    this.#carriedCredit = taxReturn.carriedCredit;
    this.#igvPayable = taxReturn.igvPayable;
    this.#incomeTaxPrepayment = taxReturn.incomeTaxPrepayment;
    this.#totalPayable = taxReturn.totalPayable;
    this.#currency = taxReturn.currency;
    this.#status = taxReturn.status;
    this.#paidOn = taxReturn.paidOn;
    this.#bankAccountId = taxReturn.bankAccountId;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get outputIgv(): number {
    return this.#outputIgv;
  }

  get inputIgv(): number {
    return this.#inputIgv;
  }

  get carriedCredit(): number {
    return this.#carriedCredit;
  }

  get igvPayable(): number {
    return this.#igvPayable;
  }

  get incomeTaxPrepayment(): number {
    return this.#incomeTaxPrepayment;
  }

  get totalPayable(): number {
    return this.#totalPayable;
  }

  get currency(): string {
    return this.#currency;
  }

  get status(): TaxReturnStatus {
    return this.#status;
  }

  get paidOn(): string | null {
    return this.#paidOn;
  }

  get bankAccountId(): number | null {
    return this.#bankAccountId;
  }

  period(): Period {
    return new Period(this.#year, this.#month);
  }

  isPaid(): boolean {
    return this.#status === TaxReturnStatus.PAID;
  }

  /** The credit this return leaves for the next month: input + carried − output, never below zero (in cents). */
  nextCarriedCredit(): number {
    const cents = Math.round(this.#inputIgv * 100) + Math.round(this.#carriedCredit * 100) - Math.round(this.#outputIgv * 100);
    return Math.max(0, cents) / 100;
  }
}
