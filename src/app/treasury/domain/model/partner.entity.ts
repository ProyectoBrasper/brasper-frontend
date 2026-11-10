import { BaseEntity } from '../../../shared/domain/model/base-entity';

/**
 * Money a partner put into the company (backend `PartnerResource.ContributionResource`). With an account it is cash
 * that came in; with an expense it is an expense the partner paid out of pocket; reimbursable means the company owes
 * it back (a debt, not capital).
 */
export class PartnerContribution implements BaseEntity {
  #id: number;
  #contributedOn: string;
  #amount: number;
  #currency: string;
  #reimbursable: boolean;
  #bankAccountId: number | null;
  #expenseId: number | null;
  #concept: string | null;

  constructor(contribution: {
    id: number;
    contributedOn: string;
    amount: number;
    currency: string;
    reimbursable: boolean;
    bankAccountId: number | null;
    expenseId: number | null;
    concept: string | null;
  }) {
    this.#id = contribution.id;
    this.#contributedOn = contribution.contributedOn;
    this.#amount = contribution.amount;
    this.#currency = contribution.currency;
    this.#reimbursable = contribution.reimbursable;
    this.#bankAccountId = contribution.bankAccountId;
    this.#expenseId = contribution.expenseId;
    this.#concept = contribution.concept;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get contributedOn(): string {
    return this.#contributedOn;
  }

  get amount(): number {
    return this.#amount;
  }

  get currency(): string {
    return this.#currency;
  }

  get reimbursable(): boolean {
    return this.#reimbursable;
  }

  get bankAccountId(): number | null {
    return this.#bankAccountId;
  }

  get expenseId(): number | null {
    return this.#expenseId;
  }

  get concept(): string | null {
    return this.#concept;
  }
}

/**
 * Partner of the company (backend `PartnerResource`): pays expenses with their own money and puts money in. The
 * contributions come inside the partner; the total adds them all, reimbursable or not.
 */
export class Partner implements BaseEntity {
  #id: number;
  #fullName: string;
  #role: string | null;
  #totalContributed: number;
  #contributions: PartnerContribution[];

  constructor(partner: {
    id: number;
    fullName: string;
    role: string | null;
    totalContributed?: number;
    contributions?: PartnerContribution[];
  }) {
    this.#id = partner.id;
    this.#fullName = partner.fullName;
    this.#role = partner.role;
    this.#totalContributed = partner.totalContributed ?? 0;
    this.#contributions = partner.contributions ?? [];
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

  get role(): string | null {
    return this.#role;
  }

  get totalContributed(): number {
    return this.#totalContributed;
  }

  get contributions(): PartnerContribution[] {
    return this.#contributions;
  }
}
