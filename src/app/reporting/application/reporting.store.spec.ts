import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Period } from '../../shared/domain/model/period';
import { CashFlowReport } from '../domain/model/cash-flow-report';
import { ReportingApi } from '../infrastructure/reporting-api';
import { ReportingStore } from './reporting.store';

const report = (from: string) => new CashFlowReport({ from, to: from, finalBalance: 0, hasNegativeBalance: false, lines: [] });

describe('ReportingStore — cash flow', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({ providers: [{ provide: ReportingApi, useValue: api }] });
    return TestBed.inject(ReportingStore);
  };

  beforeEach(() => {
    api = { getWeeklyCashFlow: vi.fn() };
  });

  it('loads the weeks of the month', () => {
    const october = report('2026-10-01');
    api['getWeeklyCashFlow'].mockReturnValue(of(october));
    const store = createStore();
    store.loadWeeklyCashFlow(new Period(2026, 10));
    expect(api['getWeeklyCashFlow']).toHaveBeenCalledWith(2026, 10);
    expect(store.cashFlow()).toBe(october);
    expect(store.loading()).toBe(false);
  });

  it('drops a late answer for a month the user already left', () => {
    const late = new Subject<CashFlowReport>();
    const november = report('2026-11-01');
    api['getWeeklyCashFlow'].mockReturnValueOnce(late).mockReturnValueOnce(of(november));
    const store = createStore();
    store.loadWeeklyCashFlow(new Period(2026, 10));
    store.loadWeeklyCashFlow(new Period(2026, 11));
    late.next(report('2026-10-01'));
    expect(store.cashFlow()).toBe(november);
  });

  it('shows the API error and leaves no report', () => {
    api['getWeeklyCashFlow'].mockReturnValue(throwError(() => new Error('Sin permiso.')));
    const store = createStore();
    store.loadWeeklyCashFlow(new Period(2026, 10));
    expect(store.error()).toBe('Sin permiso.');
    expect(store.cashFlow()).toBeNull();
    expect(store.loading()).toBe(false);
  });
});
