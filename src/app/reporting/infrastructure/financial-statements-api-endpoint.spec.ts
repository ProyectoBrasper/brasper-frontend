import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FinancialStatementsApiEndpoint } from './financial-statements-api-endpoint';

describe('FinancialStatementsApiEndpoint', () => {
  let endpoint: FinancialStatementsApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new FinancialStatementsApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the income statement of a range and reads the amounts as numbers', async () => {
    const result = firstValueFrom(endpoint.getIncomeStatement(2026, 1, 2026, 10));
    const request = http.expectOne((r) => r.url.endsWith('/reports/income-statement'));
    expect(['fromYear', 'fromMonth', 'toYear', 'toMonth'].map((key) => request.request.params.get(key))).toEqual(['2026', '1', '2026', '10']);
    request.flush({
      fromYear: 2026,
      fromMonth: 1,
      toYear: 2026,
      toMonth: 10,
      revenue: '350000.00',
      directCosts: '120000.00',
      grossProfit: '230000.00',
      operatingExpenses: '7500.00',
      operatingProfit: '222500.00',
      financialExpenses: '0',
      profitBeforeTax: '222500.00',
      incomeTax: '0',
      netProfit: '222500.00',
    });
    const statement = await result;
    expect([statement.revenue, statement.grossProfit, statement.netProfit]).toEqual([350000, 230000, 222500]);
  });

  it('asks for the balance sheet of a month and reads the amounts as numbers', async () => {
    const result = firstValueFrom(endpoint.getBalanceSheet(2026, 10));
    const request = http.expectOne((r) => r.url.endsWith('/reports/balance-sheet'));
    expect([request.request.params.get('year'), request.request.params.get('month')]).toEqual(['2026', '10']);
    request.flush({
      asOf: '2026-10-31',
      assets: { '10': '100.50' },
      liabilities: {},
      equity: { RESULT: '100.50' },
      totalAssets: '100.50',
      totalLiabilities: '0',
      totalEquity: '100.50',
      difference: '0',
      balanced: true,
    });
    const sheet = await result;
    expect(sheet.assets).toEqual({ '10': 100.5 });
    expect(sheet.equity).toEqual({ RESULT: 100.5 });
    expect([sheet.totalAssets, sheet.difference, sheet.balanced]).toEqual([100.5, 0, true]);
  });

  it('surfaces the backend detail on an error', async () => {
    const result = firstValueFrom(endpoint.getIncomeStatement(2026, 5, 2026, 1));
    http
      .expectOne((r) => r.url.endsWith('/reports/income-statement'))
      .flush({ detail: 'Valor inválido.' }, { status: 400, statusText: 'Bad Request' });
    await expect(result).rejects.toThrow('Valor inválido.');
  });
});
