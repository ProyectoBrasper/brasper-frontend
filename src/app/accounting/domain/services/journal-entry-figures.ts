import { JournalEntry, JournalLine } from '../model/journal-entry.entity';

const toCents = (amount: number) => Math.round(amount * 100);

/** Debit and credit of a set of lines, in cents (the footer of an expanded entry). */
export function lineTotals(lines: readonly JournalLine[]): { debit: number; credit: number } {
  return {
    debit: lines.reduce((sum, line) => sum + toCents(line.debit), 0) / 100,
    credit: lines.reduce((sum, line) => sum + toCents(line.credit), 0) / 100,
  };
}

/**
 * The i18n key and params of what an entry is. A manual entry is what the accountant typed (null here); an automatic
 * one is its source, translated (the backend writes a generic English text like "Invoice issued"), with the id of the
 * document behind it as `ref`; a reversal points at the entry it reverses.
 */
export function entryLabel(entry: JournalEntry): { key: string; params: Record<string, unknown>; ref: number | null } | null {
  if (entry.isManual()) {
    return null;
  }
  if (entry.isReversal()) {
    return { key: 'journalEntries.reversalOf', params: { id: entry.reversalOfId ?? entry.sourceId }, ref: null };
  }
  return { key: 'entrySource.' + entry.source, params: {}, ref: entry.sourceId };
}

/** A line being typed: either side may still be empty. */
export interface DraftLine {
  debit: number | null;
  credit: number | null;
}

/** Totals of the lines being typed and their difference (debit minus credit), in cents so they do not drift. */
export function draftTotals(lines: readonly DraftLine[]): { debit: number; credit: number; difference: number } {
  const debit = lines.reduce((sum, line) => sum + toCents(Number(line.debit) || 0), 0);
  const credit = lines.reduce((sum, line) => sum + toCents(Number(line.credit) || 0), 0);
  return { debit: debit / 100, credit: credit / 100, difference: (debit - credit) / 100 };
}

/**
 * What a new line should carry to balance the entry: the difference, on the side that is short. Null when the
 * entry already balances.
 */
export function balancingLine(lines: readonly DraftLine[]): { debit: number | null; credit: number | null } | null {
  const { difference } = draftTotals(lines);
  if (difference === 0) {
    return null;
  }
  return difference > 0 ? { debit: null, credit: difference } : { debit: -difference, credit: null };
}
