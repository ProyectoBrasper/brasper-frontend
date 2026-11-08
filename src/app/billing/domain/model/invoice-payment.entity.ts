import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * How an invoice is collected (backend `InvoicePaymentType`): the net deposit, the detraction
 * deposit (Banco de la Nación) and the client's retention certificate (no bank account).
 */
export enum InvoicePaymentType {
  NET_DEPOSIT = 'NET_DEPOSIT',
  DETRACTION_DEPOSIT = 'DETRACTION_DEPOSIT',
  RETENTION_CERTIFICATE = 'RETENTION_CERTIFICATE',
}

/**
 * One collection of an invoice. `bankAccountId` is null only for a retention certificate.
 */
export class InvoicePayment implements BaseEntity {
  #id: number;
  #invoiceId: number;
  #receivedOn: string;
  #amount: number;
  #type: InvoicePaymentType;
  #bankAccountId: number | null;
  #reference: string;

  constructor(payment: {
    id: number;
    invoiceId: number;
    receivedOn: string;
    amount: number;
    type: InvoicePaymentType;
    bankAccountId: number | null;
    reference: string;
  }) {
    this.#id = payment.id;
    this.#invoiceId = payment.invoiceId;
    this.#receivedOn = payment.receivedOn;
    this.#amount = payment.amount;
    this.#type = payment.type;
    this.#bankAccountId = payment.bankAccountId;
    this.#reference = payment.reference;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get invoiceId(): number {
    return this.#invoiceId;
  }

  get receivedOn(): string {
    return this.#receivedOn;
  }

  get amount(): number {
    return this.#amount;
  }

  get type(): InvoicePaymentType {
    return this.#type;
  }

  get bankAccountId(): number | null {
    return this.#bankAccountId;
  }

  get reference(): string {
    return this.#reference;
  }
}
