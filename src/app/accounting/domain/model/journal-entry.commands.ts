/**
 * Reverses an entry (backend `ReverseJournalEntryResource`): the backend posts a new entry on that date with the
 * lines swapped and marks the original as reversed. The date is free for the backend; the UI keeps it on or after
 * the original's date.
 */
export interface ReverseJournalEntryCommand {
  reversedOn: string;
}

/** One line of a manual entry: a debit or a credit on an account (in PEN), optionally for a project. */
export interface JournalLineCommand {
  accountCode: string;
  debit: number;
  credit: number;
  projectId: number | null;
}

/**
 * A manual entry (backend `RegisterJournalEntryResource`): at least two lines, one side per line, and the debit equal
 * to the credit (400 otherwise); every account must exist (404) and be active (400). The backend sets its source to
 * MANUAL.
 */
export interface RegisterJournalEntryCommand {
  entryDate: string;
  description: string;
  lines: JournalLineCommand[];
}
