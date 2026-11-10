import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { LoanType } from '../domain/model/loan.entity';
import { LoanResource, LoansApiEndpoint } from './loans-api-endpoint';

const resource: LoanResource = {
  id: 2,
  type: 'GRANTED',
  counterparty: 'Ing. Walter Soto (contratista)',
  principal: 30000,
  currency: 'PEN',
  interestRate: 0,
  disbursedOn: '2026-08-05',
  bankAccountId: 1,
  totalInterest: 0,
  outstandingBalance: 20000,
  status: 'PARTIALLY_PAID',
  installments: [
    { id: 9, dueOn: '2026-09-05', principal: 10000, interest: 0, paid: true, paidOn: '2026-09-05' },
    { id: 10, dueOn: '2026-10-05', principal: 10000, interest: 0, paid: false, paidOn: null },
  ],
};

describe('LoansApiEndpoint', () => {
  let endpoint: LoansApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new LoansApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps a loan with its installments inside, and amounts or rates sent as strings', () => {
    endpoint.getAll().subscribe(([loan]) => {
      expect(loan.type).toBe(LoanType.GRANTED);
      expect(loan.isReceived()).toBe(false);
      expect(loan.interestRate).toBe(0.12);
      expect(loan.outstandingBalance).toBe(20000);
      expect(loan.status).toBe(PaymentStatus.PARTIALLY_PAID);
      expect(loan.installments.map((i) => i.paid)).toEqual([true, false]);
      expect(loan.installments[0].paidOn).toBe('2026-09-05');
      expect(loan.installments[1].paidOn).toBeNull();
    });
    http
      .expectOne((r) => r.url.endsWith('/loans'))
      .flush([{ ...resource, interestRate: '0.1200', outstandingBalance: '20000.00' }]);
  });

  it('adds capital and interest to get what an installment moves in cash (27,000 = 25,000 + 2,000)', () => {
    endpoint.getAll().subscribe(([loan]) => {
      expect(loan.installments[0].total()).toBe(27000);
    });
    http
      .expectOne((r) => r.url.endsWith('/loans'))
      .flush([{ ...resource, installments: [{ id: 1, dueOn: '2026-04-10', principal: 25000, interest: 2000, paid: true, paidOn: '2026-04-10' }] }]);
  });

  it('copes with a loan that has no installments yet', () => {
    endpoint.getAll().subscribe(([loan]) => expect(loan.installments).toEqual([]));
    http.expectOne((r) => r.url.endsWith('/loans')).flush([{ ...resource, installments: [] }]);
  });

  it('registers with POST /loans, the trimmed counterparty and the rate as a fraction', () => {
    endpoint
      .register({
        type: LoanType.RECEIVED,
        counterparty: ' BBVA — capital de trabajo ',
        principal: 200000,
        currency: 'PEN',
        interestRate: 0.12,
        disbursedOn: '2026-03-10',
        bankAccountId: 2,
      })
      .subscribe((loan) => expect(loan.status).toBe(PaymentStatus.PENDING));
    const request = http.expectOne((r) => r.url.endsWith('/loans'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      type: 'RECEIVED',
      counterparty: 'BBVA — capital de trabajo',
      principal: 200000,
      currency: 'PEN',
      interestRate: 0.12,
      disbursedOn: '2026-03-10',
      bankAccountId: 2,
    });
    request.flush({
      ...resource,
      id: 1,
      type: 'RECEIVED',
      principal: 200000,
      outstandingBalance: 200000,
      status: 'PENDING',
      installments: [],
    });
  });

  it('gets one loan with GET /loans/{id}', () => {
    endpoint.getById(2).subscribe((loan) => expect(loan.counterparty).toBe('Ing. Walter Soto (contratista)'));
    http.expectOne((r) => r.url.endsWith('/loans/2')).flush(resource);
  });

  it('schedules with POST /loans/{id}/installments and answers with the whole loan', () => {
    endpoint
      .scheduleInstallment(2, { dueOn: '2026-12-05', principal: 10000, interest: 0 })
      .subscribe((loan) => expect(loan.installments).toHaveLength(3));
    const request = http.expectOne((r) => r.url.endsWith('/loans/2/installments'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ dueOn: '2026-12-05', principal: 10000, interest: 0 });
    request.flush({
      ...resource,
      installments: [
        ...resource.installments,
        { id: 12, dueOn: '2026-12-05', principal: 10000, interest: 0, paid: false, paidOn: null },
      ],
    });
  });

  it('pays with POST /loans/{id}/installments/{installmentId}/payments and the backend body', () => {
    endpoint
      .payInstallment(2, 10, { paidOn: '2026-11-09', bankAccountId: 1 })
      .subscribe((loan) => expect(loan.outstandingBalance).toBe(10000));
    const request = http.expectOne((r) => r.url.endsWith('/loans/2/installments/10/payments'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ paidOn: '2026-11-09', bankAccountId: 1 });
    request.flush({ ...resource, outstandingBalance: 10000 });
  });

  it('surfaces the backend detail when the installments would exceed the capital', () => {
    let message = '';
    endpoint
      .scheduleInstallment(2, { dueOn: '2026-12-05', principal: 30000, interest: 0 })
      .subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/loans/2/installments'))
      .flush(
        { title: 'Conflict', status: 409, detail: 'Las cuotas no pueden sumar más que el capital del préstamo.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(message).toBe('Las cuotas no pueden sumar más que el capital del préstamo.');
  });

  it('surfaces the backend detail when the account currency does not match', () => {
    let message = '';
    endpoint
      .register({
        type: LoanType.RECEIVED,
        counterparty: 'BBVA',
        principal: 1000,
        currency: 'PEN',
        interestRate: 0,
        disbursedOn: '2026-03-10',
        bankAccountId: 9,
      })
      .subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/loans'))
      .flush(
        { title: 'Bad Request', status: 400, detail: 'La moneda del préstamo debe coincidir con la de la cuenta bancaria.' },
        { status: 400, statusText: 'Bad Request' },
      );
    expect(message).toBe('La moneda del préstamo debe coincidir con la de la cuenta bancaria.');
  });
});
