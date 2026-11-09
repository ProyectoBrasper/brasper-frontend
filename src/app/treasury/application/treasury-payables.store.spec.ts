import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { CashFlowWeek } from '../../shared/domain/model/cash-flow-week';
import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { TreasuryApi } from '../infrastructure/treasury-api';
import { datosPayables, payableFixture } from '../testing/payable-fixtures';
import { TreasuryStore } from './treasury.store';

describe('TreasuryStore — payables', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TreasuryApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const store = TestBed.inject(TreasuryStore);
    store.loadPayables();
    return store;
  };

  beforeEach(() => {
    api = {
      getPayables: vi.fn().mockReturnValue(of(datosPayables())),
      getBankAccounts: vi.fn().mockReturnValue(of([])),
      payPayable: vi.fn(),
      reschedulePayable: vi.fn(),
    };
  });

  it('owes the balances of the unpaid payables (DATOS.md: S/ 103,850.00)', () => {
    expect(createStore().outstandingPayables()).toBe(103850);
  });

  it('counts payables by status for the filter chips (6 / 4 / 1 / 1)', () => {
    const store = createStore();
    expect(store.countPayablesByStatus(null)).toBe(6);
    expect(store.countPayablesByStatus(PaymentStatus.PENDING)).toBe(4);
    expect(store.countPayablesByStatus(PaymentStatus.PARTIALLY_PAID)).toBe(1);
    expect(store.countPayablesByStatus(PaymentStatus.PAID)).toBe(1);
  });

  it('replaces the paid payable with the one the API returns and re-reads the balances', () => {
    api['payPayable'].mockReturnValue(of(payableFixture({ paidAmount: 70800, balance: 0, status: PaymentStatus.PAID })));
    const store = createStore();
    store.payPayable(1, { paidOn: '2026-11-09', amount: 28500, bankAccountId: 1 });
    expect(api['payPayable']).toHaveBeenCalledWith(1, { paidOn: '2026-11-09', amount: 28500, bankAccountId: 1 });
    expect(store.outstandingPayables()).toBe(75350);
    expect(store.countPayablesByStatus(PaymentStatus.PAID)).toBe(2);
    expect(api['getBankAccounts']).toHaveBeenCalledTimes(1);
  });

  it('shows the API error when the payment exceeds the balance and keeps the payable as it was', () => {
    api['payPayable'].mockReturnValue(throwError(() => new Error('El pago supera el saldo del pago pendiente.')));
    const store = createStore();
    store.payPayable(1, { paidOn: '2026-11-09', amount: 99999, bankAccountId: 1 });
    expect(store.error()).toBe('El pago supera el saldo del pago pendiente.');
    expect(store.outstandingPayables()).toBe(103850);
    expect(api['getBankAccounts']).not.toHaveBeenCalled();
  });

  it('adds the payable created by hand to the balance and navigates to the list', () => {
    api['createPayable'] = vi.fn().mockReturnValue(
      of(payableFixture({ id: 7, totalAmount: 9600, paidAmount: 0, balance: 9600, status: PaymentStatus.PENDING, expenseId: null })),
    );
    const store = createStore();
    const router = TestBed.inject(Router);
    store.createPayable(
      {
        concept: 'Alquiler de grúa para montaje',
        type: payableFixture().type,
        totalAmount: 9600,
        currency: 'PEN',
        supplierId: 1,
        projectId: 1,
        week: new CashFlowWeek(2026, 11, 4),
      },
      ['/treasury/payables'],
    );
    expect(store.outstandingPayables()).toBe(113450);
    expect(store.countPayablesByStatus(null)).toBe(7);
    expect(router.navigate).toHaveBeenCalledWith(['/treasury/payables']);
  });

  it('moves a payable to another week', () => {
    api['reschedulePayable'].mockReturnValue(of(payableFixture({ id: 2, week: 4 })));
    const store = createStore();
    const week = new CashFlowWeek(2026, 11, 4);
    store.reschedulePayable(2, week);
    expect(api['reschedulePayable']).toHaveBeenCalledWith(2, week);
    expect(store.payables().find((p) => p.id === 2)?.week).toBe(4);
  });
});
