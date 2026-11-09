import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * Employee on the payroll (backend `EmployeeResource`). Salaries are sensitive: only admin, accounting and
 * management see them. Once hired, only the position and the salary change; terminating sets
 * `terminatedOn` and makes the employee inactive for good.
 */
export class Employee implements BaseEntity {
  #id: number;
  #fullName: string;
  #dni: string;
  #position: string;
  #monthlySalary: number;
  #currency: string;
  #hiredOn: string;
  #terminatedOn: string | null;
  #active: boolean;

  constructor(employee: {
    id: number;
    fullName: string;
    dni: string;
    position: string;
    monthlySalary: number;
    currency: string;
    hiredOn: string;
    terminatedOn: string | null;
    active: boolean;
  }) {
    this.#id = employee.id;
    this.#fullName = employee.fullName;
    this.#dni = employee.dni;
    this.#position = employee.position;
    this.#monthlySalary = employee.monthlySalary;
    this.#currency = employee.currency;
    this.#hiredOn = employee.hiredOn;
    this.#terminatedOn = employee.terminatedOn;
    this.#active = employee.active;
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

  get dni(): string {
    return this.#dni;
  }

  get position(): string {
    return this.#position;
  }

  get monthlySalary(): number {
    return this.#monthlySalary;
  }

  get currency(): string {
    return this.#currency;
  }

  get hiredOn(): string {
    return this.#hiredOn;
  }

  get terminatedOn(): string | null {
    return this.#terminatedOn;
  }

  get active(): boolean {
    return this.#active;
  }

  /** A terminated employee can no longer be edited or terminated again (backend 409). */
  isActive(): boolean {
    return this.#active;
  }
}
