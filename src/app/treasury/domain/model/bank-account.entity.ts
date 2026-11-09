import { BaseEntity } from '../../../shared/domain/model/base-entity';

/** Account types (backend `AccountType`). */
export enum BankAccountType {
  CHECKING = 'CHECKING',
  DETRACTIONS = 'DETRACTIONS',
  PETTY_CASH = 'PETTY_CASH',
}

export const BANK_ACCOUNT_TYPES: readonly BankAccountType[] = Object.values(BankAccountType);

/** Banks (backend `Bank`); CASH is the petty cash box. */
export enum Bank {
  BCP = 'BCP',
  BBVA = 'BBVA',
  BANCO_DE_LA_NACION = 'BANCO_DE_LA_NACION',
  CASH = 'CASH',
}

export const BANKS: readonly Bank[] = Object.values(Bank);

/**
 * Company bank account or petty cash (backend `BankAccountResource`). `bank` is the backend `Bank`
 * enum (BCP, BBVA, BANCO_DE_LA_NACION, CASH).
 */
export class BankAccount implements BaseEntity {
  #id: number;
  #bank: string;
  #accountNumber: string;
  #type: BankAccountType;
  #currency: string;
  #openingBalance: number;
  #currentBalance: number;

  constructor(account: {
    id: number;
    bank: string;
    accountNumber: string;
    type: BankAccountType;
    currency: string;
    openingBalance: number;
    currentBalance: number;
  }) {
    this.#id = account.id;
    this.#bank = account.bank;
    this.#accountNumber = account.accountNumber;
    this.#type = account.type;
    this.#currency = account.currency;
    this.#openingBalance = account.openingBalance;
    this.#currentBalance = account.currentBalance;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get bank(): string {
    return this.#bank;
  }

  get accountNumber(): string {
    return this.#accountNumber;
  }

  get type(): BankAccountType {
    return this.#type;
  }

  get currency(): string {
    return this.#currency;
  }

  get openingBalance(): number {
    return this.#openingBalance;
  }

  get currentBalance(): number {
    return this.#currentBalance;
  }
}
