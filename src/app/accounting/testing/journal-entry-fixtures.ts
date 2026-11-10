import { EntrySource, JournalEntry, JournalLine } from '../domain/model/journal-entry.entity';

const line = (accountCode: string, debit: number, credit: number, projectId: number | null = null) =>
  new JournalLine({ accountCode, debit, credit, currency: 'PEN', projectId });

/** An entry; override only what a test cares about. Defaults to the manual entry 204 of DATOS.md. */
export function entryFixture(overrides: Partial<ConstructorParameters<typeof JournalEntry>[0]> = {}): JournalEntry {
  return new JournalEntry({
    id: 204,
    entryDate: '2026-10-31',
    year: 2026,
    month: 10,
    description: 'Provisión honorarios contables',
    source: EntrySource.MANUAL,
    sourceId: null,
    reversed: false,
    reversalOfId: null,
    totalDebit: 3500,
    totalCredit: 3500,
    currency: 'PEN',
    lines: [line('63', 3500, 0), line('42', 0, 3500)],
    ...overrides,
  });
}

/** The October 2026 entries of DATOS.md in the backend chart, by date and number (as the backend lists them). */
export const octoberEntries = (): JournalEntry[] => [
  entryFixture({
    id: 203,
    entryDate: '2026-10-02',
    description: 'Expense',
    source: EntrySource.EXPENSE,
    sourceId: 1,
    totalDebit: 141600,
    totalCredit: 141600,
    lines: [line('60', 120000, 0, 1), line('40111', 21600, 0), line('42', 0, 141600)],
  }),
  entryFixture({
    id: 202,
    entryDate: '2026-10-28',
    description: 'Invoice issued',
    source: EntrySource.INVOICE_ISSUED,
    sourceId: 7,
    totalDebit: 295000,
    totalCredit: 295000,
    lines: [line('12', 295000, 0), line('70', 0, 250000, 4), line('40111', 0, 45000)],
  }),
  entryFixture({
    id: 205,
    entryDate: '2026-10-29',
    description: 'Imputación errónea de servicio',
    reversed: true,
    totalDebit: 1200,
    totalCredit: 1200,
    lines: [line('63', 1200, 0), line('42', 0, 1200)],
  }),
  entryFixture({
    id: 206,
    entryDate: '2026-10-29',
    description: 'Reversal of: Imputación errónea de servicio',
    source: EntrySource.REVERSAL,
    sourceId: 205,
    reversalOfId: 205,
    totalDebit: 1200,
    totalCredit: 1200,
    lines: [line('63', 0, 1200), line('42', 1200, 0)],
  }),
  entryFixture(),
];
