import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TaxReturnStatus } from '../domain/model/tax-return.entity';
import { TaxReturnResource, TaxReturnsApiEndpoint } from './tax-returns-api-endpoint';

const pen = (amount: number | string) => ({ amount: amount as number, currency: 'PEN' });

const october: TaxReturnResource = {
  id: 2,
  year: 2026,
  month: 10,
  outputIgv: pen(63000),
  inputIgv: pen(21600),
  carriedCredit: pen(0),
  igvPayable: pen(41400),
  incomeTaxPrepayment: pen(5250),
  totalPayable: pen(46650),
  status: 'DRAFT',
  paidOn: null,
  bankAccountId: null,
};

describe('TaxReturnsApiEndpoint', () => {
  let endpoint: TaxReturnsApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new TaxReturnsApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the history and maps the MoneyResources (sent as strings too)', () => {
    endpoint.getHistory().subscribe(([taxReturn]) => {
      expect(taxReturn.totalPayable).toBe(46650);
      expect(taxReturn.igvPayable).toBe(41400);
      expect(taxReturn.status).toBe(TaxReturnStatus.DRAFT);
      expect(taxReturn.paidOn).toBeNull();
    });
    http.expectOne((r) => r.url.endsWith('/tax-returns/history')).flush([{ ...october, totalPayable: pen('46650.00') }]);
  });

  it('prepares with POST /tax-returns and the year and month', () => {
    endpoint.prepare(2026, 10).subscribe((taxReturn) => expect(taxReturn.id).toBe(2));
    const request = http.expectOne((r) => r.url.endsWith('/tax-returns'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ year: 2026, month: 10 });
    request.flush(october);
  });

  it('pays with POST /{id}/payment and the backend body', () => {
    endpoint.pay(2, { paidOn: '2026-11-12', bankAccountId: 1 }).subscribe((taxReturn) => expect(taxReturn.isPaid()).toBe(true));
    const request = http.expectOne((r) => r.url.endsWith('/tax-returns/2/payment'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ paidOn: '2026-11-12', bankAccountId: 1 });
    request.flush({ ...october, status: 'PAID', paidOn: '2026-11-12', bankAccountId: 1 });
  });

  it('surfaces the backend detail when the month was already prepared', () => {
    let message = '';
    endpoint.prepare(2026, 9).subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/tax-returns'))
      .flush(
        { title: 'Conflict', status: 409, detail: 'Ya existe una declaración de impuestos para este periodo.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(message).toBe('Ya existe una declaración de impuestos para este periodo.');
  });
});
