import { BaseEntity } from '../../../shared/domain/model/base-entity';

/** Where an entry comes from (backend `EntrySource`). Only MANUAL entries are typed by a person. */
export enum EntrySource {
  MANUAL = 'MANUAL',
  INVOICE_ISSUED = 'INVOICE_ISSUED',
  INVOICE_PAYMENT = 'INVOICE_PAYMENT',
  EXPENSE = 'EXPENSE',
  FIXED_COST_PAYMENT = 'FIXED_COST_PAYMENT',
  PAYABLE_REGISTERED = 'PAYABLE_REGISTERED',
  PAYABLE_PAYMENT = 'PAYABLE_PAYMENT',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_INSTALLMENT = 'LOAN_INSTALLMENT',
  PARTNER_CONTRIBUTION = 'PARTNER_CONTRIBUTION',
  FUNDS_TRANSFER = 'FUNDS_TRANSFER',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  TAX_RETURN = 'TAX_RETURN',
  DEPRECIATION = 'DEPRECIATION',
  FIXED_ASSET_ACQUISITION = 'FIXED_ASSET_ACQUISITION',
  FIXED_ASSET_DISPOSAL = 'FIXED_ASSET_DISPOSAL',
  REVERSAL = 'REVERSAL',
}

/** One side of an entry on one account (backend `JournalLineResource`): either a debit or a credit, never both. */
export class JournalLine {
  readonly #accountCode: string;
  readonly #debit: number;
  readonly #credit: number;
  readonly #currency: string;
  readonly #projectId: number | null;

  constructor(line: { accountCode: string; debit: number; credit: number; currency: string; projectId: number | null }) {
    this.#accountCode = line.accountCode;
    this.#debit = line.debit;
    this.#credit = line.credit;
    this.#currency = line.currency;
    this.#projectId = line.projectId;
  }

  get accountCode(): string {
    return this.#accountCode;
  }

  get debit(): number {
    return this.#debit;
  }

  get credit(): number {
    return this.#credit;
  }

  get currency(): string {
    return this.#currency;
  }

  get projectId(): number | null {
    return this.#projectId;
  }
}

/**
 * An entry of the journal (backend `JournalEntryResource`). Automatic entries come from invoices, expenses,
 * payments… and only their source says what they are (the backend description is a generic English text). A
 * reversal is a new entry with the lines swapped; the reversed one stays, marked as reversed.
 */
export class JournalEntry implements BaseEntity {
  #id: number;
  #entryDate: string;
  #year: number;
  #month: number;
  #description: string;
  #source: EntrySource;
  #sourceId: number | null;
  #reversed: boolean;
  #reversalOfId: number | null;
  #totalDebit: number;
  #totalCredit: number;
  #currency: string;
  #lines: JournalLine[];

  constructor(entry: {
    id: number;
    entryDate: string;
    year: number;
    month: number;
    description: string;
    source: EntrySource;
    sourceId: number | null;
    reversed: boolean;
    reversalOfId: number | null;
    totalDebit: number;
    totalCredit: number;
    currency: string;
    lines: JournalLine[];
  }) {
    this.#id = entry.id;
    this.#entryDate = entry.entryDate;
    this.#year = entry.year;
    this.#month = entry.month;
    this.#description = entry.description;
    this.#source = entry.source;
    this.#sourceId = entry.sourceId;
    this.#reversed = entry.reversed;
    this.#reversalOfId = entry.reversalOfId;
    this.#totalDebit = entry.totalDebit;
    this.#totalCredit = entry.totalCredit;
    this.#currency = entry.currency;
    this.#lines = entry.lines;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get entryDate(): string {
    return this.#entryDate;
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get description(): string {
    return this.#description;
  }

  get source(): EntrySource {
    return this.#source;
  }

  get sourceId(): number | null {
    return this.#sourceId;
  }

  get reversed(): boolean {
    return this.#reversed;
  }

  get reversalOfId(): number | null {
    return this.#reversalOfId;
  }

  get totalDebit(): number {
    return this.#totalDebit;
  }

  get totalCredit(): number {
    return this.#totalCredit;
  }

  get currency(): string {
    return this.#currency;
  }

  get lines(): JournalLine[] {
    return this.#lines;
  }

  isManual(): boolean {
    return this.#source === EntrySource.MANUAL;
  }

  isReversal(): boolean {
    return this.#source === EntrySource.REVERSAL;
  }

  /** The backend rejects reversing a reversal or an entry already reversed (409). */
  canBeReversed(): boolean {
    return !this.#reversed && !this.isReversal();
  }

  /** Debit equals credit, in cents. */
  isBalanced(): boolean {
    return Math.round(this.#totalDebit * 100) === Math.round(this.#totalCredit * 100);
  }
}
