import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FixedCostType } from '../domain/model/fixed-cost-type';
import { FixedCostPaymentsApiEndpoint } from './fixed-cost-payments-api-endpoint';
import { FixedCostResource } from './fixed-cost.resource';
import { FixedCostsApiEndpoint } from './fixed-costs-api-endpoint';

const costResource: FixedCostResource = {
  id: 12,
  code: 'CF-012',
  concept: 'Sueldo — Andrea Salazar',
  type: 'SALARY',
  monthlyAmount: 3000,
  currency: 'PEN',
  employeeId: 6,
  expectedWeeks: [4, 2],
  active: true,
};

describe('fixed cost endpoints', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  it('creates with the backend body, trimmed text and sorted weeks; maps weeks sorted', () => {
    new FixedCostsApiEndpoint(client)
      .createFixedCost({
        code: ' CF-012 ',
        concept: ' Sueldo — Andrea Salazar ',
        type: FixedCostType.SALARY,
        monthlyAmount: 3000,
        currency: 'PEN',
        employeeId: 6,
        expectedWeeks: [4, 2],
      })
      .subscribe((cost) => expect(cost.expectedWeeks).toEqual([2, 4]));
    const request = http.expectOne((r) => r.url.endsWith('/fixed-costs'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      code: 'CF-012',
      concept: 'Sueldo — Andrea Salazar',
      type: 'SALARY',
      monthlyAmount: 3000,
      currency: 'PEN',
      employeeId: 6,
      expectedWeeks: [2, 4],
    });
    request.flush(costResource);
  });

  it('updates only concept, amount and weeks with PUT', () => {
    new FixedCostsApiEndpoint(client).updateFixedCost(12, { concept: 'Sueldo', monthlyAmount: 3100, expectedWeeks: [] }).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/fixed-costs/12'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ concept: 'Sueldo', monthlyAmount: 3100, expectedWeeks: [] });
    request.flush(costResource);
  });

  it('deactivates with POST /{id}/deactivate', () => {
    new FixedCostsApiEndpoint(client).deactivate(12).subscribe((cost) => expect(cost.isActive()).toBe(false));
    const request = http.expectOne((r) => r.url.endsWith('/fixed-costs/12/deactivate'));
    expect(request.request.method).toBe('POST');
    request.flush({ ...costResource, active: false });
  });

  it('lists the payments of a month and registers one without account or notes', () => {
    const endpoint = new FixedCostPaymentsApiEndpoint(client);
    endpoint.getByPeriod(2026, 10).subscribe((payments) => expect(payments[0].notes).toBe(''));
    const list = http.expectOne((r) => r.url.endsWith('/fixed-costs/payments'));
    expect(list.request.params.get('year')).toBe('2026');
    expect(list.request.params.get('month')).toBe('10');
    list.flush([{ id: 1, fixedCostId: 9, paidOn: '2026-10-30', year: 2026, month: 10, amount: 180, currency: 'PEN', bankAccountId: null, notes: null }]);

    endpoint.register(9, { paidOn: '2026-10-30', year: 2026, month: 10, amount: 180, bankAccountId: null, notes: '  ' }).subscribe();
    const post = http.expectOne((r) => r.url.endsWith('/fixed-costs/9/payments'));
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ paidOn: '2026-10-30', year: 2026, month: 10, amount: 180, bankAccountId: null, notes: null });
    post.flush({ id: 2, fixedCostId: 9, paidOn: '2026-10-30', year: 2026, month: 10, amount: 180, currency: 'PEN', bankAccountId: null, notes: null });
  });
});
