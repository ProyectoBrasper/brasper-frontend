import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { InvoicePayment, InvoicePaymentType } from '../domain/model/invoice-payment.entity';
import { InvoiceStatus } from '../domain/model/invoice-status';
import { BillingApi } from '../infrastructure/billing-api';
import { invoiceFixture } from '../testing/invoice-fixtures';
import { BillingStore } from './billing.store';

/** The 8 invoices of DATOS.md, reduced to what the receivables summary uses. */
const datosInvoices = [
  invoiceFixture({ id: 1, outstandingBalance: 0, status: InvoiceStatus.COLLECTED, collectedAmount: 236000 }),
  invoiceFixture({ id: 2, outstandingBalance: 0, status: InvoiceStatus.COLLECTED, collectedAmount: 212400 }),
  invoiceFixture({ id: 3, outstandingBalance: 0, status: InvoiceStatus.COLLECTED, collectedAmount: 118000 }),
  invoiceFixture({ id: 4, outstandingBalance: 64608, status: InvoiceStatus.PARTIALLY_COLLECTED }),
  invoiceFixture({ id: 5, outstandingBalance: 59000, status: InvoiceStatus.VOIDED, collectedAmount: 0 }),
  invoiceFixture({ id: 6, outstandingBalance: 155760, status: InvoiceStatus.PARTIALLY_COLLECTED }),
  invoiceFixture({ id: 7, outstandingBalance: 295000, status: InvoiceStatus.PENDING, collectedAmount: 0 }),
  invoiceFixture({ id: 8, outstandingBalance: 118000, status: InvoiceStatus.PENDING, collectedAmount: 0 }),
];

describe('BillingStore', () => {
  let api: { getInvoices: ReturnType<typeof vi.fn> };
  let role: Role;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BillingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: (...roles: Role[]) => roles.includes(role) } },
      ],
    });
    return TestBed.inject(BillingStore);
  };

  beforeEach(() => {
    role = Role.ROLE_ACCOUNTING;
    api = { getInvoices: vi.fn().mockReturnValue(of(datosInvoices)) };
  });

  it('sums the receivables without the voided invoice (S/ 633,368.00)', () => {
    const store = createStore();
    store.loadInvoices();
    expect(store.totalOutstanding()).toBe(633368);
    expect(store.pendingInvoices()).toHaveLength(4);
  });

  it('counts invoices by status for the filter chips', () => {
    const store = createStore();
    store.loadInvoices();
    expect(store.countByStatus(null)).toBe(8);
    expect(store.countByStatus(InvoiceStatus.PENDING)).toBe(2);
    expect(store.countByStatus(InvoiceStatus.PARTIALLY_COLLECTED)).toBe(2);
    expect(store.countByStatus(InvoiceStatus.COLLECTED)).toBe(3);
    expect(store.countByStatus(InvoiceStatus.VOIDED)).toBe(1);
  });

  it('exposes the API error', () => {
    api.getInvoices.mockReturnValue(throwError(() => new Error('Sesión no válida.')));
    const store = createStore();
    store.loadInvoices();
    expect(store.error()).toBe('Sesión no válida.');
    expect(store.loading()).toBe(false);
  });

  it('registers a payment in date order and refreshes the invoice from the API', () => {
    const before = invoiceFixture();
    const after = invoiceFixture({ collectedAmount: 137352, outstandingBalance: 4248 });
    const existing = new InvoicePayment({ id: 7, invoiceId: 4, receivedOn: '2026-10-06', amount: 60000, type: InvoicePaymentType.NET_DEPOSIT, bankAccountId: 1, reference: '' });
    const saved = new InvoicePayment({ id: 10, invoiceId: 4, receivedOn: '2026-11-06', amount: 60360, type: InvoicePaymentType.NET_DEPOSIT, bankAccountId: 1, reference: '' });
    Object.assign(api, {
      getInvoiceById: vi.fn().mockReturnValueOnce(of(before)).mockReturnValueOnce(of(after)),
      getPayments: vi.fn().mockReturnValue(of([existing])),
      registerPayment: vi.fn().mockReturnValue(of(saved)),
    });
    const store = createStore();
    store.loadInvoiceDetail(4);

    store.registerPayment(4, saved);

    expect((api as unknown as Record<string, ReturnType<typeof vi.fn>>)['registerPayment']).toHaveBeenCalledWith(4, saved, 'PEN');
    expect(store.payments().map((p) => p.id)).toEqual([7, 10]);
    expect(store.getInvoiceById(4)?.outstandingBalance).toBe(4248);
  });

  it('replaces a voided invoice', () => {
    Object.assign(api, { voidInvoice: vi.fn().mockReturnValue(of(invoiceFixture({ id: 8, status: InvoiceStatus.VOIDED, collectedAmount: 0 }))) });
    const store = createStore();
    store.loadInvoices();
    store.voidInvoice(8);
    expect(store.getInvoiceById(8)?.isVoided()).toBe(true);
    expect(store.totalOutstanding()).toBe(633368 - 118000);
  });

  it('lets only administration and accounting write', () => {
    expect(createStore().canWrite()).toBe(true);
    TestBed.resetTestingModule();
    role = Role.ROLE_ENGINEER;
    expect(createStore().canWrite()).toBe(false);
  });
});
