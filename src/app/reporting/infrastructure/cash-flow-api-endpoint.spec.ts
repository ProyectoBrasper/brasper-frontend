import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CashFlowApiEndpoint } from './cash-flow-api-endpoint';

describe('CashFlowApiEndpoint', () => {
  let endpoint: CashFlowApiEndpoint;
  let http: HttpTestingController;
  const url = (request: { url: string }) => request.url.endsWith('/reports/cash-flow/weekly');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new CashFlowApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the weeks of a month and reads the amounts as numbers', async () => {
    const result = firstValueFrom(endpoint.getWeekly(2026, 11));
    const request = http.expectOne(url);
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.get('month')).toBe('11');
    request.flush({
      from: '2026-11-01',
      to: '2026-11-30',
      finalBalance: '470.50',
      hasNegativeBalance: false,
      lines: [
        {
          label: '2026-11 Week 01',
          startDate: '2026-11-01',
          endDate: '2026-11-01',
          projected: false,
          openingBalance: '500.00',
          inflows: { INVOICE_COLLECTIONS: '20.50' },
          outflows: { TAXES: '50.00' },
          totalInflows: '20.50',
          totalOutflows: '50.00',
          netFlow: '-29.50',
          closingBalance: '470.50',
        },
      ],
    });
    const report = await result;
    expect(report.finalBalance).toBe(470.5);
    const [line] = report.lines;
    expect([line.openingBalance, line.netFlow, line.closingBalance]).toEqual([500, -29.5, 470.5]);
    expect(line.inflows).toEqual({ INVOICE_COLLECTIONS: 20.5 });
    expect(line.outflows).toEqual({ TAXES: 50 });
  });

  it('surfaces the backend detail on an error', async () => {
    const result = firstValueFrom(endpoint.getWeekly(2026, 13));
    http.expectOne(url).flush({ detail: 'Mes no válido.' }, { status: 400, statusText: 'Bad Request' });
    await expect(result).rejects.toThrow('Mes no válido.');
  });
});
