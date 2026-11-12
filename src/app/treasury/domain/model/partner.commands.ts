/** A partner to register (backend `RegisterPartnerResource`): the name is unique (409), the role is optional. */
export interface RegisterPartnerCommand {
  fullName: string;
  role: string | null;
}

/**
 * A contribution to register (backend `RegisterContributionResource`). The backend leaves the account optional, but
 * the UI always sends it: a contribution without an account (and without an expense, which the UI never sets) moves
 * no cash and posts no entry. With an account it posts a cash inflow there.
 */
export interface RegisterContributionCommand {
  contributedOn: string;
  amount: number;
  currency: string;
  reimbursable: boolean;
  bankAccountId: number;
  concept: string | null;
}
