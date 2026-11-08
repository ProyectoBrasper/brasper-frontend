import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { Role } from './role';

/**
 * Platform user.
 */
export class User implements BaseEntity {
  #id: number;
  #username: string;
  #fullName: string;
  #role: Role;
  #active: boolean;

  constructor(user: { id: number; username: string; fullName: string; role: Role; active: boolean }) {
    this.#id = user.id;
    this.#username = user.username;
    this.#fullName = user.fullName;
    this.#role = user.role;
    this.#active = user.active;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get username(): string {
    return this.#username;
  }

  set username(value: string) {
    this.#username = value;
  }

  get fullName(): string {
    return this.#fullName;
  }

  set fullName(value: string) {
    this.#fullName = value;
  }

  get role(): Role {
    return this.#role;
  }

  set role(value: Role) {
    this.#role = value;
  }

  get active(): boolean {
    return this.#active;
  }

  set active(value: boolean) {
    this.#active = value;
  }

  /** True when the user has any of the given roles. */
  hasRole(...roles: Role[]): boolean {
    return roles.includes(this.#role);
  }
}
