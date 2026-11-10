import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Period } from '../../shared/domain/model/period';
import { TrialBalance, TrialBalanceLine } from '../domain/model/trial-balance';
import { AccountingApi } from '../infrastructure/accounting-api';
import { AccountingStore } from './accounting.store';

const balanceOf = (month: number, debit: number) =>
  new TrialBalance({
    year: 2026,
    month,
    lines: [
      new TrialBalanceLine({ accountCode: '63', accountName: 'Servicios', debit, credit: 0, currency: 'PEN' }),
      new TrialBalanceLine({ accountCode: '42', accountName: 'Por pagar', debit: 0, credit: debit, currency: 'PEN' }),
    ],
  });

describe('AccountingStore — trial balance', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    return TestBed.inject(AccountingStore);
  };

  beforeEach(() => {
    api = { getTrialBalance: vi.fn().mockReturnValue(of(balanceOf(10, 3500))) };
  });

  it('loads the trial balance of a month', () => {
    const store = createStore();
    store.loadTrialBalance(new Period(2026, 10));
    expect(api['getTrialBalance']).toHaveBeenCalledWith(2026, 10);
    expect(store.trialBalance()?.totalDebit()).toBe(3500);
  });

  it('shows nothing while a new month loads and drops a late answer for the month left behind', () => {
    const october = new Subject<TrialBalance>();
    api['getTrialBalance'].mockReturnValueOnce(october).mockReturnValueOnce(of(balanceOf(11, 100)));
    const store = createStore();
    store.loadTrialBalance(new Period(2026, 10));
    expect(store.trialBalance()).toBeNull();
    store.loadTrialBalance(new Period(2026, 11));
    october.next(balanceOf(10, 3500));
    expect(store.trialBalance()?.month).toBe(11);
  });
});
