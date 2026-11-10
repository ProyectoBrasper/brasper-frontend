import { BaseEntity } from '../../../shared/domain/model/base-entity';

/** Kind of ledger account (backend `LedgerAccountType`). */
export enum LedgerAccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

/** In the order the chart of accounts and the filter chips show them. */
export const LEDGER_ACCOUNT_TYPES: readonly LedgerAccountType[] = [
  LedgerAccountType.ASSET,
  LedgerAccountType.LIABILITY,
  LedgerAccountType.EQUITY,
  LedgerAccountType.REVENUE,
  LedgerAccountType.EXPENSE,
];

/** Backend `AccountCode`: 2 to 10 digits, the first one from 1 to 9. */
export const ACCOUNT_CODE_PATTERN = /^[1-9][0-9]{1,9}$/;

/**
 * Account of the chart of accounts (backend `LedgerAccountResource`). The code is the account's identity in the
 * journal lines and never changes. The backend has no way to deactivate or edit an account yet.
 */
export class LedgerAccount implements BaseEntity {
  #id: number;
  #code: string;
  #name: string;
  #type: LedgerAccountType;
  #active: boolean;

  constructor(account: { id: number; code: string; name: string; type: LedgerAccountType; active: boolean }) {
    this.#id = account.id;
    this.#code = account.code;
    this.#name = account.name;
    this.#type = account.type;
    this.#active = account.active;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get code(): string {
    return this.#code;
  }

  get name(): string {
    return this.#name;
  }

  get type(): LedgerAccountType {
    return this.#type;
  }

  get active(): boolean {
    return this.#active;
  }
}
