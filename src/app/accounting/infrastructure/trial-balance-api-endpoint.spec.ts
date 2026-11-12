import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TrialBalanceApiEndpoint } from './trial-balance-api-endpoint';

describe('TrialBalanceApiEndpoint', () => {
  let endpoint: TrialBalanceApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new TrialBalanceApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the month from /ledger-accounts/trial-balance with year and month and maps the MoneyResources', () => {
    endpoint.getByPeriod(2026, 10).subscribe((balance) => {
      expect(balance.month).toBe(10);
      expect(balance.lines[0].accountName).toBe('Cuentas por cobrar comerciales');
      expect(balance.lines[1].balance()).toBe(-41400);
      expect(balance.isBalanced()).toBe(false);
    });
    const request = http.expectOne((r) => r.url.endsWith('/ledger-accounts/trial-balance'));
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.get('month')).toBe('10');
    request.flush({
      year: 2026,
      month: 10,
      lines: [
        { accountCode: '12', accountName: 'Cuentas por cobrar comerciales', debit: { amount: '413000.00', currency: 'PEN' }, credit: { amount: 0, currency: 'PEN' } },
        { accountCode: '40111', accountName: 'IGV - Cuenta propia', debit: { amount: 21600, currency: 'PEN' }, credit: { amount: 63000, currency: 'PEN' } },
      ],
    });
  });

  it('surfaces the backend detail on an error', () => {
    let message = '';
    endpoint.getByPeriod(2026, 10).subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/ledger-accounts/trial-balance'))
      .flush({ title: 'Forbidden', status: 403, detail: 'No tienes permiso.' }, { status: 403, statusText: 'Forbidden' });
    expect(message).toBe('No tienes permiso.');
  });
});
