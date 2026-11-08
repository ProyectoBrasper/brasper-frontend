import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * Company that receives quotes and invoices.
 */
export class Client implements BaseEntity {
  #id: number;
  #businessName: string;
  #ruc: string;
  #contactName: string;
  #phone: string;
  #email: string;

  constructor(client: {
    id: number;
    businessName: string;
    ruc: string;
    contactName: string;
    phone: string;
    email: string;
  }) {
    this.#id = client.id;
    this.#businessName = client.businessName;
    this.#ruc = client.ruc;
    this.#contactName = client.contactName;
    this.#phone = client.phone;
    this.#email = client.email;
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

  set businessName(value: string) {
    this.#businessName = value;
  }

  /** Peruvian tax id, 11 digits. Cannot change once the client exists. */
  get ruc(): string {
    return this.#ruc;
  }

  set ruc(value: string) {
    this.#ruc = value;
  }

  get contactName(): string {
    return this.#contactName;
  }

  set contactName(value: string) {
    this.#contactName = value;
  }

  get phone(): string {
    return this.#phone;
  }

  set phone(value: string) {
    this.#phone = value;
  }

  get email(): string {
    return this.#email;
  }

  set email(value: string) {
    this.#email = value;
  }
}
