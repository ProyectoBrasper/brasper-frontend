import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DashboardApiEndpoint } from './dashboard-api-endpoint';

describe('DashboardApiEndpoint', () => {
  let endpoint: DashboardApiEndpoint;
  let http: HttpTestingController;
  const url = (request: { url: string }) => request.url.endsWith('/reports/dashboard');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new DashboardApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for a month and reads the amounts as numbers', async () => {
    const result = firstValueFrom(endpoint.getDashboard(2026, 11));
    const request = http.expectOne(url);
    expect([request.request.params.get('year'), request.request.params.get('month')]).toEqual(['2026', '11']);
    request.flush({
      cashBalance: '494350.00',
      receivablesOutstanding: '633368.00',
      payablesOutstanding: '103850.00',
      netProfitYtd: '222500.00',
      projectedClosingBalance: '954878.00',
      projectsInProgress: 3,
      alerts: ['COST_OVERRUN:002BR-FEB-2026'],
    });
    const dashboard = await result;
    expect([dashboard.cashBalance, dashboard.netProfitYtd, dashboard.projectsInProgress]).toEqual([494350, 222500, 3]);
    expect(dashboard.alerts).toEqual(['COST_OVERRUN:002BR-FEB-2026']);
  });

  it('surfaces the backend detail on an error', async () => {
    const result = firstValueFrom(endpoint.getDashboard(2026, 11));
    http.expectOne(url).flush({ detail: 'No tienes permiso.' }, { status: 403, statusText: 'Forbidden' });
    await expect(result).rejects.toThrow('No tienes permiso.');
  });
});
