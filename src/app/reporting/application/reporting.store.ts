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
  /** Month of the cash flow shown (to drop late answers). */
  private cashFlowPeriod: Period | null = null;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  /** The cash flow shown; null while it loads. */
  readonly cashFlow = this.cashFlowSignal.asReadonly();
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();

  /** Loads the weeks of one month. */
  loadWeeklyCashFlow(period: Period): void {
    this.cashFlowPeriod = period;
    this.cashFlowSignal.set(null);
    this.run(this.reportingApi.getWeeklyCashFlow(period.year, period.month), 'Failed to load cash flow', (report) => {
      // Ignore a late answer for a month the user already left.
      if (this.cashFlowPeriod === period) {
        this.cashFlowSignal.set(report);
      }
    });
  }

  clearError(): void {
    this.errorSignal.set(null);
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
