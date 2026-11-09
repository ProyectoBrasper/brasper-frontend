import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CostCategory } from '../../../projects/domain/model/cost-category';
import { PaymentMethod } from './payment-method';
import { PaymentStatus } from './payment-status';
import { VoucherType } from './voucher-type';

/**
 * Cost the company paid or owes. Amounts come from the backend: an invoice splits out IGV, any other
 * voucher has none. Only the category, project and description can change afterwards; an expense is
 * never deleted, it is annulled. No project = general expense.
 */
export class Expense implements BaseEntity {
  #id: number;
  #spentOn: string;
  #projectId: number | null;
  #supplierId: number | null;
  #category: CostCategory;
  #description: string;
  #voucherType: VoucherType;
  #voucherNumber: string;
  #taxableBase: number;
  #igv: number;
  #total: number;
  #currency: string;
  #paymentMethod: PaymentMethod;
  #bankAccountId: number | null;
  #partnerId: number | null;
  #paymentStatus: PaymentStatus;
  #annulled: boolean;

  constructor(expense: {
    id: number;
    spentOn: string;
    projectId: number | null;
    supplierId: number | null;
    category: CostCategory;
    description: string;
    voucherType: VoucherType;
    voucherNumber: string;
    taxableBase: number;
    igv: number;
    total: number;
    currency: string;
    paymentMethod: PaymentMethod;
    bankAccountId: number | null;
    partnerId: number | null;
    paymentStatus: PaymentStatus;
    annulled: boolean;
  }) {
    this.#id = expense.id;
    this.#spentOn = expense.spentOn;
    this.#projectId = expense.projectId;
    this.#supplierId = expense.supplierId;
    this.#category = expense.category;
    this.#description = expense.description;
    this.#voucherType = expense.voucherType;
    this.#voucherNumber = expense.voucherNumber;
    this.#taxableBase = expense.taxableBase;
    this.#igv = expense.igv;
    this.#total = expense.total;
    this.#currency = expense.currency;
    this.#paymentMethod = expense.paymentMethod;
    this.#bankAccountId = expense.bankAccountId;
    this.#partnerId = expense.partnerId;
    this.#paymentStatus = expense.paymentStatus;
    this.#annulled = expense.annulled;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get spentOn(): string {
    return this.#spentOn;
  }

  get projectId(): number | null {
    return this.#projectId;
  }

  get supplierId(): number | null {
    return this.#supplierId;
  }

  get category(): CostCategory {
    return this.#category;
  }

  get description(): string {
    return this.#description;
  }

  get voucherType(): VoucherType {
    return this.#voucherType;
  }

  get voucherNumber(): string {
    return this.#voucherNumber;
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

  get currency(): string {
    return this.#currency;
  }

  get paymentMethod(): PaymentMethod {
    return this.#paymentMethod;
  }

  get bankAccountId(): number | null {
    return this.#bankAccountId;
  }

  get partnerId(): number | null {
    return this.#partnerId;
  }

  get paymentStatus(): PaymentStatus {
    return this.#paymentStatus;
  }

  get annulled(): boolean {
    return this.#annulled;
  }

  /** A project's expense counts toward its direct cost; no project means a general expense. */
  isDirectCost(): boolean {
    return this.#projectId !== null;
  }

  /** Only an invoice gives IGV credit. */
  generatesTaxCredit(): boolean {
    return this.#voucherType === VoucherType.INVOICE;
  }

  /** Reclassify or annul only while it is not annulled. */
  isActive(): boolean {
    return !this.#annulled;
  }
}
