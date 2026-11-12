import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EntrySource } from '../domain/model/journal-entry.entity';
import { JournalEntriesApiEndpoint, JournalEntryResource } from './journal-entries-api-endpoint';

const pen = (amount: number | string) => ({ amount: amount as number, currency: 'PEN' });

const resource: JournalEntryResource = {
  id: 202,
  entryDate: '2026-10-28',
  year: 2026,
  month: 10,
  description: 'Invoice issued',
  source: 'INVOICE_ISSUED',
  sourceId: 7,
  reversed: false,
  reversalOfId: null,
  totalDebit: pen(295000),
  totalCredit: pen(295000),
  lines: [
    { accountCode: '12', debit: pen(295000), credit: pen(0), projectId: null },
    { accountCode: '70', debit: pen(0), credit: pen(250000), projectId: 4 },
    { accountCode: '40111', debit: pen(0), credit: pen(45000), projectId: null },
  ],
};

describe('JournalEntriesApiEndpoint', () => {
  let endpoint: JournalEntriesApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new JournalEntriesApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the entries of a month with year and month and maps the MoneyResources (sent as strings too)', () => {
    endpoint.getByPeriod(2026, 10).subscribe(([entry]) => {
      expect(entry.source).toBe(EntrySource.INVOICE_ISSUED);
      expect(entry.totalDebit).toBe(295000);
      expect(entry.currency).toBe('PEN');
      expect(entry.lines[1].credit).toBe(250000);
      expect(entry.lines[1].projectId).toBe(4);
      expect(entry.isBalanced()).toBe(true);
    });
    const request = http.expectOne((r) => r.url.endsWith('/journal-entries'));
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.get('month')).toBe('10');
    request.flush([{ ...resource, totalDebit: pen('295000.00'), lines: [resource.lines[0], { ...resource.lines[1], credit: pen('250000.00') }] }]);
  });

  it('registers a manual entry with POST /journal-entries, the description trimmed and the amounts in PEN', () => {
    endpoint
      .register({
        entryDate: '2026-11-10',
        description: ' Ajuste de provisión de servicios ',
        lines: [
          { accountCode: '63', debit: 2000, credit: 0, projectId: 4 },
          { accountCode: '42', debit: 0, credit: 2000, projectId: null },
        ],
      })
      .subscribe((entry) => expect(entry.isManual()).toBe(true));
    const request = http.expectOne((r) => r.url.endsWith('/journal-entries'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      entryDate: '2026-11-10',
      description: 'Ajuste de provisión de servicios',
      lines: [
        { accountCode: '63', debit: pen(2000), credit: pen(0), projectId: 4 },
        { accountCode: '42', debit: pen(0), credit: pen(2000), projectId: null },
      ],
    });
    request.flush({ ...resource, id: 208, source: 'MANUAL', sourceId: null, description: 'Ajuste de provisión de servicios' });
  });

  it('surfaces the backend detail when an account does not exist', () => {
    let message = '';
    endpoint
      .register({ entryDate: '2026-11-10', description: 'X', lines: [] })
      .subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/journal-entries'))
      .flush(
        { title: 'Not Found', status: 404, detail: 'Una cuenta contable del asiento no existe.' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(message).toBe('Una cuenta contable del asiento no existe.');
  });

  it('reverses with POST /{id}/reversal and answers with the new reversal', () => {
    endpoint.reverse(202, { reversedOn: '2026-11-10' }).subscribe((reversal) => {
      expect(reversal.isReversal()).toBe(true);
      expect(reversal.reversalOfId).toBe(202);
    });
    const request = http.expectOne((r) => r.url.endsWith('/journal-entries/202/reversal'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reversedOn: '2026-11-10' });
    request.flush({
      ...resource,
      id: 207,
      entryDate: '2026-11-10',
      month: 11,
      description: 'Reversal of: Invoice issued',
      source: 'REVERSAL',
      sourceId: 202,
      reversalOfId: 202,
    });
  });

  it('surfaces the backend detail when the entry was already reversed', () => {
    let message = '';
    endpoint.reverse(205, { reversedOn: '2026-11-10' }).subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/journal-entries/205/reversal'))
      .flush(
        { title: 'Conflict', status: 409, detail: 'El asiento ya está revertido o es una reversa.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(message).toBe('El asiento ya está revertido o es una reversa.');
  });
});
