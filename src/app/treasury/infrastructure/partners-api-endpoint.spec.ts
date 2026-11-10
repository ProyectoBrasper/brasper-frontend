import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PartnerResource, PartnersApiEndpoint } from './partners-api-endpoint';

const resource: PartnerResource = {
  id: 1,
  fullName: 'Roberto Salas Lazo',
  role: 'Socio fundador',
  totalContributed: 60000,
  contributions: [
    {
      id: 3,
      contributedOn: '2026-10-25',
      amount: 2400,
      currency: 'PEN',
      reimbursable: true,
      bankAccountId: null,
      expenseId: 6,
      concept: 'Materiales menores para 002BR-FEB-2026',
    },
  ],
};

describe('PartnersApiEndpoint', () => {
  let endpoint: PartnersApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new PartnersApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps a partner with its contributions inside and amounts sent as strings', () => {
    endpoint.getAll().subscribe(([partner]) => {
      expect(partner.totalContributed).toBe(60000);
      expect(partner.contributions[0].amount).toBe(2400);
      expect(partner.contributions[0].expenseId).toBe(6);
      expect(partner.contributions[0].bankAccountId).toBeNull();
    });
    http
      .expectOne((r) => r.url.endsWith('/partners'))
      .flush([{ ...resource, totalContributed: '60000.00', contributions: [{ ...resource.contributions[0], amount: '2400.00' }] }]);
  });

  it('copes with a partner without role nor contributions', () => {
    endpoint.getAll().subscribe(([partner]) => {
      expect(partner.role).toBeNull();
      expect(partner.contributions).toEqual([]);
    });
    http.expectOne((r) => r.url.endsWith('/partners')).flush([{ id: 3, fullName: 'Nuevo', role: null, totalContributed: 0, contributions: [] }]);
  });

  it('registers a partner with POST /partners, the name trimmed and a blank role as null', () => {
    endpoint.register({ fullName: ' Lucía Paredes ', role: '  ' }).subscribe((partner) => expect(partner.id).toBe(3));
    const request = http.expectOne((r) => r.url.endsWith('/partners'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ fullName: 'Lucía Paredes', role: null });
    request.flush({ id: 3, fullName: 'Lucía Paredes', role: null, totalContributed: 0, contributions: [] });
  });

  it('registers a contribution with POST /partners/{id}/contributions and answers with the partner', () => {
    endpoint
      .registerContribution(2, {
        contributedOn: '2026-11-10',
        amount: 5000,
        currency: 'PEN',
        reimbursable: false,
        bankAccountId: 1,
        concept: ' Aporte de capital ',
      })
      .subscribe((partner) => expect(partner.totalContributed).toBe(30000));
    const request = http.expectOne((r) => r.url.endsWith('/partners/2/contributions'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      contributedOn: '2026-11-10',
      amount: 5000,
      currency: 'PEN',
      reimbursable: false,
      bankAccountId: 1,
      concept: 'Aporte de capital',
    });
    request.flush({ id: 2, fullName: 'Mariela Cuba Núñez', role: 'Socia', totalContributed: 30000, contributions: [] });
  });

  it('surfaces the backend detail when the name is already in use', () => {
    let message = '';
    endpoint.register({ fullName: 'Roberto Salas Lazo', role: null }).subscribe({ error: (error: Error) => (message = error.message) });
    http
      .expectOne((r) => r.url.endsWith('/partners'))
      .flush({ title: 'Conflict', status: 409, detail: 'Ya existe un socio con ese nombre.' }, { status: 409, statusText: 'Conflict' });
    expect(message).toBe('Ya existe un socio con ese nombre.');
  });
});
