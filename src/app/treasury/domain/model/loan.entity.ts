import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { PaymentStatus } from '../../../shared/domain/model/payment-status';

/** Which way the money went when the loan was disbursed (backend `LoanType`). */
export enum LoanType {
  /** The company borrowed: the disbursement is an inflow and the installments are paid by the company. */
  RECEIVED = 'RECEIVED',
  /** The company lent: the disbursement is an outflow. */
  GRANTED = 'GRANTED',
}

export const LOAN_TYPES: readonly LoanType[] = Object.values(LoanType);

/**
 * What the screen shows for an installment. The backend only knows paid or not: OVERDUE is derived in the front
 * for an unpaid installment whose due date has passed.
 */
export enum InstallmentStatus {
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
}

/** One installment of a loan (backend `LoanResource.InstallmentResource`): capital plus interest, due on a day. */
export class LoanInstallment implements BaseEntity {
  #id: number;
  #dueOn: string;
  #principal: number;
  #interest: number;
  #paid: boolean;
  #paidOn: string | null;

  constructor(installment: {
    id: number;
    dueOn: string;
    principal: number;
    interest: number;
    paid: boolean;
    paidOn: string | null;
  }) {
    this.#id = installment.id;
    this.#dueOn = installment.dueOn;
    this.#principal = installment.principal;
    this.#interest = installment.interest;
    this.#paid = installment.paid;
    this.#paidOn = installment.paidOn;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get dueOn(): string {
    return this.#dueOn;
  }

  get principal(): number {
    return this.#principal;
  }

  get interest(): number {
    return this.#interest;
  }

  get paid(): boolean {
    return this.#paid;
  }

  get paidOn(): string | null {
    return this.#paidOn;
  }

  /** What paying it moves in cash: capital plus interest (in cents, no float drift). */
  total(): number {
    return (Math.round(this.#principal * 100) + Math.round(this.#interest * 100)) / 100;
  }

  /** Paid, or pending until the day after it is due (`today` as `yyyy-MM-dd`, so strings compare as dates). */
  status(today: string): InstallmentStatus {
    if (this.#paid) {
      return InstallmentStatus.PAID;
    }
    return this.#dueOn < today ? InstallmentStatus.OVERDUE : InstallmentStatus.PENDING;
  }
}

/**
 * A loan the company received or granted (backend `LoanResource`). The rate is a fraction (0.12 = 12 % a year) and
 * only informative: the interest is whatever the installments say. The outstanding balance, the total interest and
 * the status come from the backend; the installments arrive inside the loan.
 */
export class Loan implements BaseEntity {
  #id: number;
  #type: LoanType;
  #counterparty: string;
  #principal: number;
  #currency: string;
  #interestRate: number;
  #disbursedOn: string;
  #bankAccountId: number;
  #totalInterest: number;
  #outstandingBalance: number;
  #status: PaymentStatus;
  #installments: LoanInstallment[];

  constructor(loan: {
    id: number;
    type: LoanType;
    counterparty: string;
    principal: number;
    currency: string;
    interestRate: number;
    disbursedOn: string;
    bankAccountId: number;
    totalInterest: number;
    outstandingBalance: number;
    status: PaymentStatus;
    installments: LoanInstallment[];
  }) {
    this.#id = loan.id;
    this.#type = loan.type;
    this.#counterparty = loan.counterparty;
    this.#principal = loan.principal;
    this.#currency = loan.currency;
    this.#interestRate = loan.interestRate;
    this.#disbursedOn = loan.disbursedOn;
    this.#bankAccountId = loan.bankAccountId;
    this.#totalInterest = loan.totalInterest;
    this.#outstandingBalance = loan.outstandingBalance;
    this.#status = loan.status;
    this.#installments = loan.installments;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get type(): LoanType {
    return this.#type;
  }

  get counterparty(): string {
    return this.#counterparty;
  }

  get principal(): number {
    return this.#principal;
  }

  get currency(): string {
    return this.#currency;
  }

  get interestRate(): number {
    return this.#interestRate;
  }

  get disbursedOn(): string {
    return this.#disbursedOn;
  }

  get bankAccountId(): number {
    return this.#bankAccountId;
  }

  get totalInterest(): number {
    return this.#totalInterest;
  }

  get outstandingBalance(): number {
    return this.#outstandingBalance;
  }

  get status(): PaymentStatus {
    return this.#status;
  }

  get installments(): LoanInstallment[] {
    return this.#installments;
  }

  isReceived(): boolean {
    return this.#type === LoanType.RECEIVED;
  }

  isPaid(): boolean {
    return this.#status === PaymentStatus.PAID;
  }
}
