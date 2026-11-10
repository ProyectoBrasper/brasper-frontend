import { LedgerAccountType } from './ledger-account.entity';

/** An account to add to the chart (backend `CreateLedgerAccountResource`): the code is unique (409). */
export interface CreateLedgerAccountCommand {
  code: string;
  name: string;
  type: LedgerAccountType;
}
