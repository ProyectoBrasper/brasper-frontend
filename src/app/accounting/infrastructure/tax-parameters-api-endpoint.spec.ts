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
