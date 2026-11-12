import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TaxParametersApiEndpoint } from './tax-parameters-api-endpoint';

describe('TaxParametersApiEndpoint', () => {
  let endpoint: TaxParametersApiEndpoint;
  let http: HttpTestingController;
  const url = (request: { url: string }) => request.url.endsWith('/tax-parameters');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new TaxParametersApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the rates in force on the given date', async () => {
    const result = firstValueFrom(endpoint.getAt('2026-11-05'));
    const request = http.expectOne(url);
    expect(request.request.params.get('date')).toBe('2026-11-05');
    request.flush({ id: 1, effectiveFrom: '2026-01-01', igv: 0.18, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 });
    const parameters = await result;
    expect([parameters?.igv, parameters?.detraction, parameters?.retention]).toEqual([0.18, 0.12, 0.03]);
  });

  it('reads the history', async () => {
    const result = firstValueFrom(endpoint.getHistory());
    http
      .expectOne((request) => request.url.endsWith('/tax-parameters/history'))
      .flush([{ id: 1, effectiveFrom: '2026-01-01', igv: '0.1800', detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 }]);
    const [parameters] = await result;
    expect(parameters.igv).toBe(0.18);
  });

  it('sets new rates with POST and the fractions', async () => {
    const command = { effectiveFrom: '2027-01-01', igv: 0.19, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 };
    const result = firstValueFrom(endpoint.set(command));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    request.flush({ id: 2, ...command });
    expect((await result).id).toBe(2);
  });

  it('surfaces the backend detail when the effective date is already used', async () => {
    const result = firstValueFrom(
      endpoint.set({ effectiveFrom: '2026-01-01', igv: 0.18, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 }),
    );
    http
      .expectOne(url)
      .flush(
        { title: 'Conflict', status: 409, detail: 'Ya existen parámetros de impuestos para esa fecha de vigencia.' },
        { status: 409, statusText: 'Conflict' },
      );
    await expect(result).rejects.toThrow('Ya existen parámetros de impuestos para esa fecha de vigencia.');
  });

  it('returns null when no parameters are configured (404)', async () => {
    const result = firstValueFrom(endpoint.getAt('2025-06-01'));
    http.expectOne(url).flush(null, { status: 404, statusText: 'Not Found' });
    expect(await result).toBeNull();
  });

  it('fails on other errors', async () => {
    const result = firstValueFrom(endpoint.getAt('2026-11-05'));
    http.expectOne(url).flush(null, { status: 403, statusText: 'Forbidden' });
    await expect(result).rejects.toThrow();
  });
});
