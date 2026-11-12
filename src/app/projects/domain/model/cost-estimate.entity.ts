import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CostCategory } from './cost-category';

/**
 * Estimated direct cost of a project for one category, in the project's currency.
 */
export class CostEstimate implements BaseEntity {
  #id: number;
  #projectId: number;
  #category: CostCategory;
  #estimatedAmount: number;

  constructor(estimate: { id: number; projectId: number; category: CostCategory; estimatedAmount: number }) {
    this.#id = estimate.id;
    this.#projectId = estimate.projectId;
    this.#category = estimate.category;
    this.#estimatedAmount = estimate.estimatedAmount;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get projectId(): number {
    return this.#projectId;
  }

  set projectId(value: number) {
    this.#projectId = value;
  }

  get category(): CostCategory {
    return this.#category;
  }

  set category(value: CostCategory) {
    this.#category = value;
  }

  get estimatedAmount(): number {
    return this.#estimatedAmount;
  }

  set estimatedAmount(value: number) {
    this.#estimatedAmount = value;
  }
}
