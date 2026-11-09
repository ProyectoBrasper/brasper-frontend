import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Bank, BankAccountType } from '../domain/model/bank-account.entity';
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
});
