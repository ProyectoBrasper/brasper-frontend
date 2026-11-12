import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Period } from '../../shared/domain/model/period';
import { JournalEntry } from '../domain/model/journal-entry.entity';
import { AccountingApi } from '../infrastructure/accounting-api';
import { entryFixture, octoberEntries } from '../testing/journal-entry-fixtures';
import { backendChart } from '../testing/ledger-account-fixtures';
import { AccountingStore } from './accounting.store';

describe('AccountingStore — journal entries', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    return TestBed.inject(AccountingStore);
  };

  beforeEach(() => {
    api = {
      getJournalEntries: vi.fn().mockReturnValue(of(octoberEntries())),
      reverseJournalEntry: vi.fn(),
      registerJournalEntry: vi.fn(),
      getLedgerAccounts: vi.fn().mockReturnValue(of(backendChart())),
    };
  });

  it('loads the entries of a month', () => {
    const store = createStore();
    store.loadJournalEntries(new Period(2026, 10));
    expect(api['getJournalEntries']).toHaveBeenCalledWith(2026, 10);
    expect(store.journalEntries().map((entry) => entry.id)).toEqual([203, 202, 205, 206, 204]);
  });

  it('drops a late answer for a month the user already left', () => {
    const october = new Subject<JournalEntry[]>();
    api['getJournalEntries'].mockReturnValueOnce(october).mockReturnValueOnce(of([entryFixture({ id: 300, month: 11 })]));
    const store = createStore();
    store.loadJournalEntries(new Period(2026, 10));
    store.loadJournalEntries(new Period(2026, 11));
    october.next(octoberEntries());
    expect(store.journalEntries().map((entry) => entry.id)).toEqual([300]);
  });

  it('reads the shown month again after a reversal (the original is now reversed)', () => {
    api['reverseJournalEntry'].mockReturnValue(of(entryFixture({ id: 207 })));
    const store = createStore();
    store.loadJournalEntries(new Period(2026, 10));
    store.reverseJournalEntry(204, { reversedOn: '2026-11-10' });
    expect(api['reverseJournalEntry']).toHaveBeenCalledWith(204, { reversedOn: '2026-11-10' });
    expect(api['getJournalEntries']).toHaveBeenCalledTimes(2);
  });

  it('shows the API error and keeps the month when the entry cannot be reversed', () => {
    api['reverseJournalEntry'].mockReturnValue(throwError(() => new Error('El asiento ya está revertido o es una reversa.')));
    const store = createStore();
    store.loadJournalEntries(new Period(2026, 10));
    store.reverseJournalEntry(205, { reversedOn: '2026-11-10' });
    expect(store.error()).toBe('El asiento ya está revertido o es una reversa.');
    expect(store.journalEntries()).toHaveLength(5);
    expect(api['getJournalEntries']).toHaveBeenCalledTimes(1);
  });

  it('opens the journal in the month of the new entry with it expanded', () => {
    api['registerJournalEntry'].mockReturnValue(of(entryFixture({ id: 208, entryDate: '2026-09-30', year: 2026, month: 9 })));
    const store = createStore();
    const command = {
      entryDate: '2026-09-30',
      description: 'Ajuste',
      lines: [
        { accountCode: '63', debit: 100, credit: 0, projectId: null },
        { accountCode: '42', debit: 0, credit: 100, projectId: null },
      ],
    };
    store.registerJournalEntry(command);
    expect(api['registerJournalEntry']).toHaveBeenCalledWith(command);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/accounting/journal-entries'], {
      queryParams: { year: 2026, month: 9, open: 208 },
    });
  });

  it('stays on the form with the API error when an account is inactive', () => {
    api['registerJournalEntry'].mockReturnValue(throwError(() => new Error('Una cuenta contable del asiento está inactiva.')));
    const store = createStore();
    store.registerJournalEntry({ entryDate: '2026-11-10', description: 'X', lines: [] });
    expect(store.error()).toBe('Una cuenta contable del asiento está inactiva.');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('finds the account of a code for its name', () => {
    const store = createStore();
    store.loadLedgerAccounts();
    expect(store.getLedgerAccountByCode('40111')?.name).toBe('IGV - Cuenta propia');
    expect(store.getLedgerAccountByCode('99')).toBeUndefined();
  });
});
