import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Bank, BankAccountType } from '../domain/model/bank-account.entity';
import { MovementDirection } from '../domain/model/cash-movement.entity';
import { BankAccountsApiEndpoint } from './bank-accounts-api-endpoint';

describe('BankAccountsApiEndpoint', () => {
  let endpoint: BankAccountsApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new BankAccountsApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('opens an account with the backend body (trimmed number) and maps the balances it answers', () => {
    endpoint
      .open({
        bank: Bank.BBVA,
        accountNumber: ' 0011-0234-0200987654 ',
        type: BankAccountType.CHECKING,
        currency: 'PEN',
        openingBalance: 20000,
        openedOn: '2026-11-09',
      })
      .subscribe((account) => {
        expect(account.currentBalance).toBe(20000);
        expect(account.type).toBe(BankAccountType.CHECKING);
      });
    const request = http.expectOne((r) => r.url.endsWith('/bank-accounts'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      bank: 'BBVA',
      accountNumber: '0011-0234-0200987654',
      type: 'CHECKING',
      currency: 'PEN',
      openingBalance: 20000,
      openedOn: '2026-11-09',
    });
    request.flush({
      id: 5,
      bank: 'BBVA',
      accountNumber: '0011-0234-0200987654',
      type: 'CHECKING',
      currency: 'PEN',
      openingBalance: '20000.00',
      currentBalance: '20000.00',
    });
  });

  it('reads the movements of a month and maps a missing concept to an empty string', () => {
    endpoint.getMovements(1, 2026, 10).subscribe((movements) => {
      expect(movements[0].isInflow()).toBe(true);
      expect(movements[0].concept).toBe('');
      expect(movements[0].amount).toBe(60000);
    });
    const request = http.expectOne((r) => r.url.endsWith('/bank-accounts/1/movements'));
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.get('month')).toBe('10');
    request.flush([{ id: 4, occurredOn: '2026-10-06', direction: 'INFLOW', amount: '60000.00', concept: null, source: 'INVOICE_PAYMENT', sourceId: 7 }]);
  });

  it('registers an adjustment with POST /{id}/adjustments, a blank concept as null', () => {
    endpoint.adjust(4, { occurredOn: '2026-10-31', direction: MovementDirection.OUTFLOW, amount: 50, concept: '  ' }).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/bank-accounts/4/adjustments'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ occurredOn: '2026-10-31', direction: 'OUTFLOW', amount: 50, concept: null });
    request.flush({ id: 4, bank: 'CASH', accountNumber: 'Caja chica', type: 'PETTY_CASH', currency: 'PEN', openingBalance: 6000, currentBalance: 3450 });
  });

  it('transfers with POST /transfers', () => {
    endpoint.transfer({ fromAccountId: 1, toAccountId: 4, transferredOn: '2026-11-02', amount: 2000, concept: ' Reposición de caja chica ' }).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/bank-accounts/transfers'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fromAccountId: 1,
      toAccountId: 4,
      transferredOn: '2026-11-02',
      amount: 2000,
      concept: 'Reposición de caja chica',
    });
    request.flush({ id: 1, bank: 'BCP', accountNumber: '193', type: 'CHECKING', currency: 'PEN', openingBalance: 450000, currentBalance: 316450 });
  });
});
