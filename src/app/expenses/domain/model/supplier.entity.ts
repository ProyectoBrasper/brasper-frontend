import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { SupplierType } from './supplier-type';

/** Company or person that sells to Brasper. `ruc` is empty for a natural person without one. */
export class Supplier implements BaseEntity {
  #id: number;
  #businessName: string;
  #ruc: string;
  #type: SupplierType;
  #phone: string;

  constructor(supplier: { id: number; businessName: string; ruc: string; type: SupplierType; phone: string }) {
    this.#id = supplier.id;
    this.#businessName = supplier.businessName;
    this.#ruc = supplier.ruc;
    this.#type = supplier.type;
    this.#phone = supplier.phone;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get businessName(): string {
    return this.#businessName;
  }

  get ruc(): string {
    return this.#ruc;
  }

  get type(): SupplierType {
    return this.#type;
  }

  get phone(): string {
    return this.#phone;
  }
}
