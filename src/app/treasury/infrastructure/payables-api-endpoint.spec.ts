import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CashFlowWeek } from '../../shared/domain/model/cash-flow-week';
import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { PayablesApiEndpoint, PayableResource } from './payables-api-endpoint';

const resource: PayableResource = {
  id: 2,
  concept: 'Honorarios técnico instalador',
  type: 'TECHNICIAN',
  totalAmount: 12000,
  currency: 'PEN',
  paidAmount: 0,
  balance: 12000,
  supplierId: 3,
  projectId: 4,
  expenseId: null,
  year: 2026,
  month: 11,
  week: 1,
  status: 'PENDING',
};

describe('PayablesApiEndpoint', () => {
  let endpoint: PayablesApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new PayablesApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps a payable with its week and amounts sent as strings', () => {
    endpoint.getAll().subscribe(([payable]) => {
      expect(payable.balance).toBe(12000);
      expect(payable.cashFlowWeek().number).toBe(1);
      expect(payable.isPaid()).toBe(false);
    });
    http.expectOne((r) => r.url.endsWith('/payables')).flush([{ ...resource, balance: '12000.00' }]);
  });

  it('pays with POST /{id}/payments and the backend body', () => {
    endpoint.pay(2, { paidOn: '2026-11-09', amount: 5000, bankAccountId: 2 }).subscribe((payable) => {
      expect(payable.status).toBe(PaymentStatus.PARTIALLY_PAID);
    });
    const request = http.expectOne((r) => r.url.endsWith('/payables/2/payments'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ paidOn: '2026-11-09', amount: 5000, bankAccountId: 2 });
    request.flush({ ...resource, paidAmount: 5000, balance: 7000, status: 'PARTIALLY_PAID' });
  });

  it('reschedules with PUT /{id}/schedule and year, month and week', () => {
    endpoint.reschedule(2, new CashFlowWeek(2026, 11, 6)).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/payables/2/schedule'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ year: 2026, month: 11, week: 6 });
    request.flush({ ...resource, week: 6 });
  });
});
