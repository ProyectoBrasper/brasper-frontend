import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * Asset the company owns and depreciates in a straight line (backend `FixedAsset`). The backend calculates the IGV and
 * the total from the base, and the accumulated depreciation and book value as of today. It cannot be edited or
 * deleted, only disposed of.
 */
export class FixedAsset implements BaseEntity {
  #id: number;
  #description: string;
  #acquiredOn: string;
  #taxableBase: number;
  #igv: number;
  #total: number;
  #currency: string;
  #usefulLifeMonths: number;
  #expenseId: number | null;
  #disposedOn: string | null;
  #monthlyDepreciation: number;
  #accumulatedDepreciation: number;
  #bookValue: number;

  constructor(asset: {
    id: number;
    description: string;
    acquiredOn: string;
    taxableBase: number;
    igv: number;
    total: number;
    currency: string;
    usefulLifeMonths: number;
    expenseId: number | null;
    disposedOn: string | null;
    monthlyDepreciation: number;
    accumulatedDepreciation: number;
    bookValue: number;
  }) {
    this.#id = asset.id;
    this.#description = asset.description;
    this.#acquiredOn = asset.acquiredOn;
    this.#taxableBase = asset.taxableBase;
    this.#igv = asset.igv;
    this.#total = asset.total;
    this.#currency = asset.currency;
    this.#usefulLifeMonths = asset.usefulLifeMonths;
    this.#expenseId = asset.expenseId;
    this.#disposedOn = asset.disposedOn;
    this.#monthlyDepreciation = asset.monthlyDepreciation;
    this.#accumulatedDepreciation = asset.accumulatedDepreciation;
    this.#bookValue = asset.bookValue;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get description(): string {
    return this.#description;
  }

  /** `yyyy-MM-dd`. */
  get acquiredOn(): string {
    return this.#acquiredOn;
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

  get usefulLifeMonths(): number {
    return this.#usefulLifeMonths;
  }

  /** The expense that paid for it; null = an asset the company already owned. */
  get expenseId(): number | null {
    return this.#expenseId;
  }

  /** `yyyy-MM-dd`; null while in use. */
  get disposedOn(): string | null {
    return this.#disposedOn;
  }

  get monthlyDepreciation(): number {
    return this.#monthlyDepreciation;
  }

  get accumulatedDepreciation(): number {
    return this.#accumulatedDepreciation;
  }

  /** As of today. For a disposed asset the backend still answers cost minus accumulated, which was written off. */
  get bookValue(): number {
    return this.#bookValue;
  }

  get disposed(): boolean {
    return this.#disposedOn !== null;
  }
}
