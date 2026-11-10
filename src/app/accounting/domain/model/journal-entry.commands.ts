/**
 * Reverses an entry (backend `ReverseJournalEntryResource`): the backend posts a new entry on that date with the
 * lines swapped and marks the original as reversed. The date is free for the backend; the UI keeps it on or after
 * the original's date.
 */
export interface ReverseJournalEntryCommand {
  reversedOn: string;
}
