import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Period } from '../../shared/domain/model/period';
import { TaxReturnStatus } from '../domain/model/tax-return.entity';
import { AccountingApi } from '../infrastructure/accounting-api';
import { octoberDraft, taxReturnFixture } from '../testing/tax-return-fixtures';
import { AccountingStore } from './accounting.store';

describe('AccountingStore — tax returns', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const store = TestBed.inject(AccountingStore);
    store.loadTaxReturns();
    return store;
  };

  beforeEach(() => {
    api = {
      getTaxReturns: vi.fn().mockReturnValue(of([taxReturnFixture()])),
      prepareTaxReturn: vi.fn(),
      payTaxReturn: vi.fn(),
    };
  });

  it('adds the prepared return, latest first', () => {
    api['prepareTaxReturn'].mockReturnValue(of(octoberDraft()));
    const store = createStore();
    store.prepareTaxReturn(new Period(2026, 10));
    expect(api['prepareTaxReturn']).toHaveBeenCalledWith(2026, 10);
    expect(store.taxReturns().map((r) => r.month)).toEqual([10, 9]);
  });

  it('replaces the paid return and lets the caller re-read the balances', () => {
    api['getTaxReturns'].mockReturnValue(of([octoberDraft(), taxReturnFixture()]));
    api['payTaxReturn'].mockReturnValue(of(taxReturnFixture({ id: 2, month: 10, totalPayable: 46650 })));
    const store = createStore();
    const onPaid = vi.fn();
    store.payTaxReturn(2, { paidOn: '2026-11-12', bankAccountId: 1 }, onPaid);
    expect(api['payTaxReturn']).toHaveBeenCalledWith(2, { paidOn: '2026-11-12', bankAccountId: 1 });
    expect(store.taxReturns().find((r) => r.id === 2)?.status).toBe(TaxReturnStatus.PAID);
    expect(store.taxReturns()).toHaveLength(2);
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it('shows the API error and does not re-read the balances when the account does not exist', () => {
    api['payTaxReturn'].mockReturnValue(throwError(() => new Error('No se encontró la cuenta bancaria.')));
    const store = createStore();
    const onPaid = vi.fn();
    store.payTaxReturn(1, { paidOn: '2026-11-12', bankAccountId: 99 }, onPaid);
    expect(store.error()).toBe('No se encontró la cuenta bancaria.');
    expect(onPaid).not.toHaveBeenCalled();
  });
});
