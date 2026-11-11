import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Period } from '../../shared/domain/model/period';
import { CashFlowReport } from '../domain/model/cash-flow-report';
import { ReportingApi } from '../infrastructure/reporting-api';

/** Reporting context state: the reports the backend calculates. The rest come with their screens. */
@Injectable({ providedIn: 'root' })
export class ReportingStore {
  private readonly reportingApi = inject(ReportingApi);

  private readonly cashFlowSignal = signal<CashFlowReport | null>(null);
  /** Number of the last cash flow asked for (to drop late answers). */
  private cashFlowRequest = 0;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  /** The cash flow shown; null while it loads. */
  readonly cashFlow = this.cashFlowSignal.asReadonly();
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
