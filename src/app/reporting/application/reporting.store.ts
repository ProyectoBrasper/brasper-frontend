import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Period } from '../../shared/domain/model/period';
import { BalanceSheet } from '../domain/model/balance-sheet';
import { CashFlowReport } from '../domain/model/cash-flow-report';
import { Dashboard } from '../domain/model/dashboard';
import { IncomeStatement } from '../domain/model/income-statement';
import { ProjectProfitability } from '../domain/model/project-profitability';
import { ReportingApi } from '../infrastructure/reporting-api';

/** Reporting context state: the reports and the dashboard the backend calculates. */
@Injectable({ providedIn: 'root' })
export class ReportingStore {
  private readonly reportingApi = inject(ReportingApi);

  private readonly cashFlowSignal = signal<CashFlowReport | null>(null);
  private readonly incomeStatementSignal = signal<IncomeStatement | null>(null);
  private readonly balanceSheetSignal = signal<BalanceSheet | null>(null);
  private readonly profitabilitySignal = signal<ProjectProfitability[]>([]);
  private readonly dashboardSignal = signal<Dashboard | null>(null);
  /** Number of the last report of each kind asked for (to drop late answers). */
  private cashFlowRequest = 0;
  private incomeStatementRequest = 0;
  private balanceSheetRequest = 0;
  private profitabilityRequest = 0;
  private dashboardRequest = 0;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  /** The cash flow shown; null while it loads. */
  readonly cashFlow = this.cashFlowSignal.asReadonly();
  /** The income statement shown; null while it loads. */
  readonly incomeStatement = this.incomeStatementSignal.asReadonly();
  /** The balance sheet shown; null while it loads. */
  readonly balanceSheet = this.balanceSheetSignal.asReadonly();
  /** Every project, whatever its status. */
  readonly profitability = this.profitabilitySignal.asReadonly();
  /** The dashboard shown; null while it loads. */
  readonly dashboard = this.dashboardSignal.asReadonly();
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();

  /** Loads the weeks of one month. */
  loadWeeklyCashFlow(period: Period): void {
    this.loadCashFlow(this.reportingApi.getWeeklyCashFlow(period.year, period.month));
  }

  /** Loads one line per month of a range, both ends included. */
  loadMonthlyCashFlow(from: Period, to: Period): void {
    this.loadCashFlow(this.reportingApi.getMonthlyCashFlow(from.year, from.month, to.year, to.month));
  }

  /** Loads `weeks` weeks starting with the one that contains `from` (`yyyy-MM-dd`). */
  loadCashFlowProjection(from: string, weeks: number): void {
    this.loadCashFlow(this.reportingApi.getCashFlowProjection(from, weeks));
  }

  /** Loads the results of a range of months, both ends included. */
  loadIncomeStatement(from: Period, to: Period): void {
    const number = ++this.incomeStatementRequest;
    this.incomeStatementSignal.set(null);
    this.run(this.reportingApi.getIncomeStatement(from.year, from.month, to.year, to.month), 'Failed to load income statement', (statement) => {
      if (this.incomeStatementRequest === number) {
        this.incomeStatementSignal.set(statement);
      }
    });
  }

  /** Loads the position at the end of a month. */
  loadBalanceSheet(period: Period): void {
    const number = ++this.balanceSheetRequest;
    this.balanceSheetSignal.set(null);
    this.run(this.reportingApi.getBalanceSheet(period.year, period.month), 'Failed to load balance sheet', (sheet) => {
      if (this.balanceSheetRequest === number) {
        this.balanceSheetSignal.set(sheet);
      }
    });
  }

  /** Loads every project; the month decides the profit recognized by that month's progress. */
  loadPortfolioProfitability(period: Period): void {
    const number = ++this.profitabilityRequest;
    this.run(this.reportingApi.getPortfolioProfitability(period.year, period.month), 'Failed to load project profitability', (projects) => {
      if (this.profitabilityRequest === number) {
        this.profitabilitySignal.set(projects);
      }
    });
  }

  /** Loads the summary of a month. */
  loadDashboard(period: Period): void {
    const number = ++this.dashboardRequest;
    this.dashboardSignal.set(null);
    this.run(this.reportingApi.getDashboard(period.year, period.month), 'Failed to load dashboard', (dashboard) => {
      if (this.dashboardRequest === number) {
        this.dashboardSignal.set(dashboard);
      }
    });
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private loadCashFlow(request: Observable<CashFlowReport>): void {
    const number = ++this.cashFlowRequest;
    this.cashFlowSignal.set(null);
    this.run(request, 'Failed to load cash flow', (report) => {
      // Ignore a late answer for a view the user already left.
      if (this.cashFlowRequest === number) {
        this.cashFlowSignal.set(report);
      }
    });
  }

  private run<T>(request: Observable<T>, fallback: string, onSuccess: (value: T) => void): void {
    this.pendingSignal.update((pending) => pending + 1);
    this.errorSignal.set(null);
    request.subscribe({
      next: (value) => {
        onSuccess(value);
        this.pendingSignal.update((pending) => pending - 1);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : fallback);
        this.pendingSignal.update((pending) => pending - 1);
      },
    });
  }
}
