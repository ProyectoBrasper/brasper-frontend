import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { InvoiceStatus } from './invoice-status';

/**
 * Issued invoice. All amounts are calculated by the backend (IGV, total, retention, detraction,
 * net amount, collected amount and outstanding balance); the frontend only shows them.
 * `number` has the backend format `F001-00000031` (series + 8-digit correlative).
 */
export class Invoice implements BaseEntity {
  #id: number;
  #number: string;
  #issuedOn: string;
  #purchaseOrder: string;
  #projectId: number;
  #clientId: number;
  #currency: string;
  #taxableBase: number;
  #igv: number;
  #total: number;
  #retention: number;
  #detraction: number;
  #selfDetraction: boolean;
  #advance: boolean;
  #netAmount: number;
  #collectedAmount: number;
  #outstandingBalance: number;
  #status: InvoiceStatus;
  #notes: string;

  constructor(invoice: {
    id: number;
    number: string;
    issuedOn: string;
    purchaseOrder: string;
    projectId: number;
    clientId: number;
    currency: string;
    taxableBase: number;
    igv: number;
    total: number;
    retention: number;
    detraction: number;
    selfDetraction: boolean;
    advance: boolean;
    netAmount: number;
    collectedAmount: number;
    outstandingBalance: number;
    status: InvoiceStatus;
    notes: string;
  }) {
    this.#id = invoice.id;
    this.#number = invoice.number;
    this.#issuedOn = invoice.issuedOn;
    this.#purchaseOrder = invoice.purchaseOrder;
    this.#projectId = invoice.projectId;
    this.#clientId = invoice.clientId;
    this.#currency = invoice.currency;
    this.#taxableBase = invoice.taxableBase;
    this.#igv = invoice.igv;
    this.#total = invoice.total;
    this.#retention = invoice.retention;
    this.#detraction = invoice.detraction;
    this.#selfDetraction = invoice.selfDetraction;
    this.#advance = invoice.advance;
    this.#netAmount = invoice.netAmount;
    this.#collectedAmount = invoice.collectedAmount;
    this.#outstandingBalance = invoice.outstandingBalance;
    this.#status = invoice.status;
    this.#notes = invoice.notes;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get number(): string {
    return this.#number;
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

  get clientId(): number {
    return this.#clientId;
  }

  get currency(): string {
    return this.#currency;
  }

  get taxableBase(): number {
    return this.#taxableBase;
  }

  get igv(): number {
    return this.#igv;
  }

  get total(): number {
    return this.#total;
  }

  get retention(): number {
    return this.#retention;
  }

  get detraction(): number {
    return this.#detraction;
  }

  get selfDetraction(): boolean {
    return this.#selfDetraction;
  }

  get advance(): boolean {
    return this.#advance;
  }

  get netAmount(): number {
    return this.#netAmount;
  }

  get collectedAmount(): number {
    return this.#collectedAmount;
  }

  get outstandingBalance(): number {
    return this.#outstandingBalance;
  }

  get status(): InvoiceStatus {
    return this.#status;
  }

  get notes(): string {
    return this.#notes;
  }

  isVoided(): boolean {
    return this.#status === InvoiceStatus.VOIDED;
  }

  /** Not voided and with something left to collect (counts as receivable). */
  isCollectable(): boolean {
    return !this.isVoided() && this.#outstandingBalance > 0;
  }

  /** Backend rule: only an invoice without payments can be voided. */
  canBeVoided(): boolean {
    return !this.isVoided() && this.#collectedAmount === 0;
  }
}
