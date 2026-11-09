import { BaseEntity } from '../../../shared/domain/model/base-entity';

/** Partner of the company who can pay expenses with their own money (backend `PartnerResource`). */
export class Partner implements BaseEntity {
  #id: number;
  #fullName: string;
  #role: string;

  constructor(partner: { id: number; fullName: string; role: string }) {
    this.#id = partner.id;
    this.#fullName = partner.fullName;
    this.#role = partner.role;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get fullName(): string {
    return this.#fullName;
  }

  get role(): string {
    return this.#role;
  }
}
