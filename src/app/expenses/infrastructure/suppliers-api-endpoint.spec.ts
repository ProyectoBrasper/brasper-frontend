import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Supplier } from '../domain/model/supplier.entity';
import { SupplierType } from '../domain/model/supplier-type';
import { SuppliersApiEndpoint } from './suppliers-api-endpoint';

describe('SuppliersApiEndpoint', () => {
  let endpoint: SuppliersApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new SuppliersApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only the business name and the phone when updating', () => {
    const supplier = new Supplier({
      id: 2,
      businessName: 'Electro Andes S.A.C.',
      ruc: '20512223332',
      type: SupplierType.COMPANY,
      phone: '',
    });
    endpoint.update(supplier, 2).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/suppliers/2'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ businessName: 'Electro Andes S.A.C.', phone: null });
    request.flush({ id: 2, businessName: 'Electro Andes S.A.C.', ruc: '20512223332', type: 'COMPANY', phone: null });
  });

  it('creates a natural person without RUC sending null', () => {
    const supplier = new Supplier({
      id: 0,
      businessName: 'Marco Huamán',
      ruc: '',
      type: SupplierType.NATURAL_PERSON,
      phone: '976 123 456',
    });
    endpoint.create(supplier).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/suppliers'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      businessName: 'Marco Huamán',
      ruc: null,
      type: 'NATURAL_PERSON',
      phone: '976 123 456',
    });
    request.flush({ id: 9, businessName: 'Marco Huamán', ruc: null, type: 'NATURAL_PERSON', phone: '976 123 456' });
  });
});
