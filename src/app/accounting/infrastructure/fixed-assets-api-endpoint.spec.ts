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

  it('surfaces the backend detail when the currency is not supported', async () => {
    const result = firstValueFrom(endpoint.register({ ...command, currency: 'USD' }));
    http
      .expectOne(url)
      .flush({ detail: 'Por ahora los activos fijos solo se registran en PEN.' }, { status: 422, statusText: 'Unprocessable Entity' });
    await expect(result).rejects.toThrow('Por ahora los activos fijos solo se registran en PEN.');
  });
});
