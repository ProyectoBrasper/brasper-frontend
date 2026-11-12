import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LedgerAccountType } from '../domain/model/ledger-account.entity';
import { LedgerAccountsApiEndpoint } from './ledger-accounts-api-endpoint';

describe('LedgerAccountsApiEndpoint', () => {
  let endpoint: LedgerAccountsApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new LedgerAccountsApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the chart of accounts', () => {
    endpoint.getAll().subscribe(([account]) => {
      expect(account.code).toBe('40111');
      expect(account.type).toBe(LedgerAccountType.LIABILITY);
      expect(account.active).toBe(true);
    });
    http
      .expectOne((r) => r.url.endsWith('/ledger-accounts'))
      .flush([{ id: 5, code: '40111', name: 'IGV - Cuenta propia', type: 'LIABILITY', active: true }]);
  });

  it('creates with POST /ledger-accounts and the code and name trimmed', () => {
    endpoint
      .createAccount({ code: ' 10411 ', name: ' Banco BCP cta. cte. ', type: LedgerAccountType.ASSET })
      .subscribe((account) => expect(account.id).toBe(22));
    const request = http.expectOne((r) => r.url.endsWith('/ledger-accounts'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: '10411', name: 'Banco BCP cta. cte.', type: 'ASSET' });
    request.flush({ id: 22, code: '10411', name: 'Banco BCP cta. cte.', type: 'ASSET', active: true });
  });

  it('surfaces the backend detail when the code is already in use', () => {
    let message = '';
    endpoint
      .createAccount({ code: '10', name: 'Caja', type: LedgerAccountType.ASSET })
      .subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/ledger-accounts'))
      .flush(
        { title: 'Conflict', status: 409, detail: 'Ya existe una cuenta contable con ese código.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(message).toBe('Ya existe una cuenta contable con ese código.');
  });
});
