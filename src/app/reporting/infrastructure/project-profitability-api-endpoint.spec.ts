import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ProjectProfitabilityApiEndpoint } from './project-profitability-api-endpoint';

describe('ProjectProfitabilityApiEndpoint', () => {
  let endpoint: ProjectProfitabilityApiEndpoint;
  let http: HttpTestingController;
  const url = (request: { url: string }) => request.url.endsWith('/reports/projects/profitability');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new ProjectProfitabilityApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the portfolio of a month and reads the amounts as numbers', async () => {
    const result = firstValueFrom(endpoint.getPortfolio(2026, 10));
    const request = http.expectOne(url);
    expect([request.request.params.get('year'), request.request.params.get('month')]).toEqual(['2026', '10']);
    request.flush([
      {
        projectId: 2,
        code: '002BR-FEB-2026',
        name: 'Tableros',
        clientName: 'Cliente',
        status: 'IN_PROGRESS',
        currency: 'PEN',
        budget: '420500.00',
        estimatedCost: '250000.00',
        actualCost: '256800.00',
        actualCostByCategory: { MATERIALS: '256800.00' },
        costDeviation: '6800.00',
        salesCommission: '12404.75',
        grossProfit: '68082.86',
        margin: '0.1619',
        accumulatedProgress: '0.68',
        recognizedProfitInPeriod: '2723.31',
        invoiced: '259600.00',
        collected: '76992.00',
      },
    ]);
    const [project] = await result;
    expect([project.budget, project.margin, project.accumulatedProgress]).toEqual([420500, 0.1619, 0.68]);
    expect(project.actualCostByCategory).toEqual({ MATERIALS: 256800 });
    expect(project.isOverEstimate()).toBe(true);
  });

  it('surfaces the backend detail on an error', async () => {
    const result = firstValueFrom(endpoint.getPortfolio(2026, 13));
    http.expectOne(url).flush({ detail: 'Valor inválido.' }, { status: 400, statusText: 'Bad Request' });
    await expect(result).rejects.toThrow('Valor inválido.');
  });
});
