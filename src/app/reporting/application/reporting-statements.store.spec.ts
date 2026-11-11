import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Period } from '../../shared/domain/model/period';
import { BalanceSheet } from '../domain/model/balance-sheet';
import { IncomeStatement } from '../domain/model/income-statement';
import { ProjectProfitability } from '../domain/model/project-profitability';
import { ReportingApi } from '../infrastructure/reporting-api';
import { ReportingStore } from './reporting.store';

const statement = (netProfit: number) =>
  new IncomeStatement({
    revenue: 0,
    directCosts: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingProfit: 0,
    financialExpenses: 0,
    profitBeforeTax: 0,
    incomeTax: 0,
    netProfit,
  });

const sheet = (asOf: string) =>
  new BalanceSheet({ asOf, assets: {}, liabilities: {}, equity: {}, totalAssets: 0, totalLiabilities: 0, totalEquity: 0, difference: 0, balanced: true });

describe('ReportingStore — financial statements', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({ providers: [{ provide: ReportingApi, useValue: api }] });
    return TestBed.inject(ReportingStore);
  };

  beforeEach(() => {
    api = { getIncomeStatement: vi.fn(), getBalanceSheet: vi.fn(), getPortfolioProfitability: vi.fn() };
  });

  it('loads the income statement of a range', () => {
    const loaded = statement(10);
    api['getIncomeStatement'].mockReturnValue(of(loaded));
    const store = createStore();
    store.loadIncomeStatement(new Period(2026, 1), new Period(2026, 10));
    expect(api['getIncomeStatement']).toHaveBeenCalledWith(2026, 1, 2026, 10);
    expect(store.incomeStatement()).toBe(loaded);
  });

  it('drops a late income statement for a range the user already left', () => {
    const late = new Subject<IncomeStatement>();
    const current = statement(20);
    api['getIncomeStatement'].mockReturnValueOnce(late).mockReturnValueOnce(of(current));
    const store = createStore();
    store.loadIncomeStatement(new Period(2026, 1), new Period(2026, 5));
    store.loadIncomeStatement(new Period(2026, 1), new Period(2026, 6));
    late.next(statement(10));
    expect(store.incomeStatement()).toBe(current);
  });

  it('loads the balance sheet of a month', () => {
    const loaded = sheet('2026-10-31');
    api['getBalanceSheet'].mockReturnValue(of(loaded));
    const store = createStore();
    store.loadBalanceSheet(new Period(2026, 10));
    expect(api['getBalanceSheet']).toHaveBeenCalledWith(2026, 10);
    expect(store.balanceSheet()).toBe(loaded);
  });

  it('drops a late balance sheet for a month the user already left', () => {
    const late = new Subject<BalanceSheet>();
    const current = sheet('2026-11-30');
    api['getBalanceSheet'].mockReturnValueOnce(late).mockReturnValueOnce(of(current));
    const store = createStore();
    store.loadBalanceSheet(new Period(2026, 10));
    store.loadBalanceSheet(new Period(2026, 11));
    late.next(sheet('2026-10-31'));
    expect(store.balanceSheet()).toBe(current);
  });

  it('loads the projects of a month and drops a late answer', () => {
    const late = new Subject<ProjectProfitability[]>();
    const current: ProjectProfitability[] = [];
    api['getPortfolioProfitability'].mockReturnValueOnce(late).mockReturnValueOnce(of(current));
    const store = createStore();
    store.loadPortfolioProfitability(new Period(2026, 10));
    store.loadPortfolioProfitability(new Period(2026, 11));
    expect(api['getPortfolioProfitability']).toHaveBeenLastCalledWith(2026, 11);
    late.next([{} as ProjectProfitability]);
    expect(store.profitability()).toBe(current);
  });

  it('shows the API error and leaves no statement', () => {
    api['getBalanceSheet'].mockReturnValue(throwError(() => new Error('Sin permiso.')));
    const store = createStore();
    store.loadBalanceSheet(new Period(2026, 10));
    expect(store.error()).toBe('Sin permiso.');
    expect(store.balanceSheet()).toBeNull();
  });
});
