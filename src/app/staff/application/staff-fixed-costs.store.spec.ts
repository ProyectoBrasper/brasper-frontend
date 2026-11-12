import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Period } from '../../shared/domain/model/period';
import { FixedCost } from '../domain/model/fixed-cost.entity';
import { FixedCostPayment } from '../domain/model/fixed-cost-payment.entity';
import { FixedCostType } from '../domain/model/fixed-cost-type';
import { StaffApi } from '../infrastructure/staff-api';
import { datosFixedCosts, datosOctoberPayments, paymentFixture } from '../testing/fixed-cost-fixtures';
import { StaffStore } from './staff.store';

describe('StaffStore — fixed costs', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: StaffApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const store = TestBed.inject(StaffStore);
    store.loadFixedCosts();
    return store;
  };

  beforeEach(() => {
    api = {
      getFixedCosts: vi.fn().mockReturnValue(of(datosFixedCosts())),
      getPaymentsByPeriod: vi.fn().mockReturnValue(of(datosOctoberPayments())),
      registerPayment: vi.fn(),
      deactivateFixedCost: vi.fn(),
    };
  });

  it('matches the October 2026 summary of DATOS.md (33,010 / 32,570 / 440)', () => {
    const store = createStore();
    store.loadPayments(new Period(2026, 10));
    expect(api['getPaymentsByPeriod']).toHaveBeenCalledWith(2026, 10);
    expect(store.monthlyFixedCostTotal()).toBe(33010);
    expect(store.paidInPeriod()).toBe(32570);
    expect(store.pendingInPeriod()).toBe(440);
    expect(store.pendingAmount(9)).toBe(180);
    expect(store.paidAmount(1)).toBe(8500);
  });

  it('owes nothing for an inactive cost', () => {
    const store = createStore();
    store.loadPayments(new Period(2026, 10));
    expect(store.pendingAmount(11)).toBe(0);
  });

  it('adds a payment of the shown month and updates paid and pending', () => {
    api['registerPayment'].mockReturnValue(of(paymentFixture(9, 9, 180)));
    const store = createStore();
    store.loadPayments(new Period(2026, 10));
    store.registerPayment(9, { paidOn: '2026-10-30', year: 2026, month: 10, amount: 180, bankAccountId: 1, notes: '' });
    expect(store.pendingAmount(9)).toBe(0);
    expect(store.pendingInPeriod()).toBe(260);
    expect(store.paidInPeriod()).toBe(32750);
  });

  it('does not add a payment of another month to the shown one', () => {
    api['registerPayment'].mockReturnValue(of(paymentFixture(9, 9, 180, 11)));
    const store = createStore();
    store.loadPayments(new Period(2026, 10));
    store.registerPayment(9, { paidOn: '2026-11-02', year: 2026, month: 11, amount: 180, bankAccountId: null, notes: '' });
    expect(store.payments()).toHaveLength(8);
  });

  it('ignores a late answer for a month the user already left', () => {
    const october = new Subject<FixedCostPayment[]>();
    api['getPaymentsByPeriod'].mockImplementation((_: number, month: number) => (month === 10 ? october : of([])));
    const store = createStore();
    store.loadPayments(new Period(2026, 10));
    store.loadPayments(new Period(2026, 11));
    october.next(datosOctoberPayments());
    october.complete();
    expect(store.payments()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('keeps a deactivated cost listed but out of the monthly total', () => {
    const deactivated = new FixedCost({
      id: 10,
      code: 'CF-010',
      concept: 'ITF',
      type: FixedCostType.ITF,
      monthlyAmount: 260,
      currency: 'PEN',
      employeeId: null,
      expectedWeeks: [4],
      active: false,
    });
    api['deactivateFixedCost'].mockReturnValue(of(deactivated));
    const store = createStore();
    store.deactivateFixedCost(10);
    expect(store.fixedCosts()).toHaveLength(11);
    expect(store.monthlyFixedCostTotal()).toBe(32750);
  });

  it('exposes the API error when paying an inactive cost', () => {
    api['registerPayment'].mockReturnValue(throwError(() => new Error('El costo fijo está inactivo.')));
    const store = createStore();
    store.registerPayment(11, { paidOn: '2026-10-30', year: 2026, month: 10, amount: 100, bankAccountId: null, notes: '' });
    expect(store.error()).toBe('El costo fijo está inactivo.');
  });
});
