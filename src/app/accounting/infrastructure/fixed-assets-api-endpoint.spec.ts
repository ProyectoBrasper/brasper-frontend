import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FixedAssetsApiEndpoint } from './fixed-assets-api-endpoint';

describe('FixedAssetsApiEndpoint', () => {
  let endpoint: FixedAssetsApiEndpoint;
  let http: HttpTestingController;
  const url = (request: { url: string }) => request.url.endsWith('/fixed-assets');
  const resource = {
    id: 1,
    description: 'Laptops',
    acquiredOn: '2026-06-15',
    taxableBase: '20000.00',
    igv: '3600.00',
    total: '23600.00',
    currency: 'PEN',
    usefulLifeMonths: 40,
    expenseId: null,
    disposedOn: null,
    monthlyDepreciation: '500.00',
    accumulatedDepreciation: '2500.00',
    bookValue: '17500.00',
  };
  const command = {
    description: '  Laptops ',
    acquiredOn: '2026-06-15',
    taxableBase: 20000,
    currency: 'PEN',
    usefulLifeMonths: 40,
    expenseId: 3,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new FixedAssetsApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the list with the amounts as numbers', async () => {
    const result = firstValueFrom(endpoint.getAll());
    http.expectOne(url).flush([resource, { ...resource, id: 2, disposedOn: '2026-10-01' }]);
    const [inUse, disposed] = await result;
    expect([inUse.taxableBase, inUse.bookValue, inUse.disposed]).toEqual([20000, 17500, false]);
    expect(disposed.disposed).toBe(true);
  });

  it('registers with POST and the description trimmed', async () => {
    const result = firstValueFrom(endpoint.register(command));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...command, description: 'Laptops' });
    request.flush({ ...resource, expenseId: 3 });
    expect((await result).expenseId).toBe(3);
  });

  it('runs the depreciation of a month and reads the entries', async () => {
    const result = firstValueFrom(endpoint.runMonthlyDepreciation(2026, 11));
    const request = http.expectOne((r) => r.url.endsWith('/fixed-assets/depreciation'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ year: 2026, month: 11 });
    const money = (amount: number) => ({ amount, currency: 'PEN' });
    request.flush([
      {
        id: 213,
        entryDate: '2026-11-30',
        year: 2026,
        month: 11,
        description: 'Depreciation 2026-11',
        source: 'DEPRECIATION',
        sourceId: 2026110,
        reversed: false,
        reversalOfId: null,
        totalDebit: money(1000),
        totalCredit: money(1000),
        lines: [
          { accountCode: '68', debit: money(1000), credit: money(0), projectId: null },
          { accountCode: '39', debit: money(0), credit: money(1000), projectId: null },
        ],
      },
    ]);
    const [entry] = await result;
    expect([entry.id, entry.totalDebit]).toEqual([213, 1000]);
  });

  it('surfaces the backend detail when the month was already posted', async () => {
    const result = firstValueFrom(endpoint.runMonthlyDepreciation(2026, 10));
    http
      .expectOne((r) => r.url.endsWith('/fixed-assets/depreciation'))
      .flush({ detail: 'La depreciación de este período ya fue contabilizada.' }, { status: 409, statusText: 'Conflict' });
    await expect(result).rejects.toThrow('La depreciación de este período ya fue contabilizada.');
  });

  it('disposes of an asset on a date', async () => {
    const result = firstValueFrom(endpoint.dispose(1, { disposedOn: '2026-11-10' }));
    const request = http.expectOne((r) => r.url.endsWith('/fixed-assets/1/disposal'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ disposedOn: '2026-11-10' });
    request.flush({ ...resource, disposedOn: '2026-11-10' });
    expect((await result).disposed).toBe(true);
  });

  it('surfaces the backend detail when the currency is not supported', async () => {
    const result = firstValueFrom(endpoint.register({ ...command, currency: 'USD' }));
    http
      .expectOne(url)
      .flush({ detail: 'Por ahora los activos fijos solo se registran en PEN.' }, { status: 422, statusText: 'Unprocessable Entity' });
    await expect(result).rejects.toThrow('Por ahora los activos fijos solo se registran en PEN.');
  });
});
