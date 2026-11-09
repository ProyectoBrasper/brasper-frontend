import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CostCategory } from '../../projects/domain/model/cost-category';
import { PaymentMethod } from '../domain/model/payment-method';
import { RegisterExpenseCommand } from '../domain/model/register-expense.command';
import { VoucherType } from '../domain/model/voucher-type';
import { ExpensesApiEndpoint } from './expenses-api-endpoint';

const expenseResource = {
  id: 8,
  spentOn: '2026-11-03',
  projectId: null,
  supplierId: null,
  category: 'OTHER',
  description: null,
  voucherType: 'NO_VOUCHER',
  voucherNumber: null,
  taxableBase: 500,
  igv: 0,
  total: 500,
  currency: 'PEN',
  paymentMethod: 'PARTNER_CONTRIBUTION',
  bankAccountId: null,
  partnerId: 2,
  paymentStatus: 'PENDING',
  annulled: false,
};

describe('ExpensesApiEndpoint', () => {
  let endpoint: ExpensesApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new ExpensesApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registers a general expense without voucher paid by a partner, sending blanks as null', () => {
    const command: RegisterExpenseCommand = {
      spentOn: '2026-11-03',
      projectId: null,
      supplierId: null,
      category: CostCategory.OTHER,
      description: '  ',
      voucherType: VoucherType.NO_VOUCHER,
      voucherNumber: '',
      amount: 500,
      amountIncludesIgv: false,
      currency: 'PEN',
      paymentMethod: PaymentMethod.PARTNER_CONTRIBUTION,
      bankAccountId: null,
      partnerId: 2,
      paid: false,
    };
    endpoint.register(command).subscribe((expense) => expect(expense.paymentStatus).toBe('PENDING'));
    const request = http.expectOne((r) => r.url.endsWith('/expenses'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spentOn: '2026-11-03',
      projectId: null,
      supplierId: null,
      category: 'OTHER',
      description: null,
      voucherType: 'NO_VOUCHER',
      voucherNumber: null,
      amount: 500,
      amountIncludesIgv: false,
      currency: 'PEN',
      paymentMethod: 'PARTNER_CONTRIBUTION',
      bankAccountId: null,
      partnerId: 2,
      paid: false,
    });
    request.flush(expenseResource);
  });

  it('corrects only the project, the category and the description with PUT', () => {
    endpoint.correct(8, { projectId: 3, category: CostCategory.LABOR, description: ' Instalación ' }).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/expenses/8'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ projectId: 3, category: 'LABOR', description: 'Instalación' });
    request.flush({ ...expenseResource, projectId: 3, category: 'LABOR', description: 'Instalación' });
  });

  it('annuls with POST /{id}/annul', () => {
    endpoint.annul(8).subscribe((expense) => expect(expense.annulled).toBe(true));
    const request = http.expectOne((r) => r.url.endsWith('/expenses/8/annul'));
    expect(request.request.method).toBe('POST');
    request.flush({ ...expenseResource, annulled: true });
  });
});
