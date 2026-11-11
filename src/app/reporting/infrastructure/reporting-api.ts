import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { CashFlowReport } from '../domain/model/cash-flow-report';
import { CashFlowApiEndpoint } from './cash-flow-api-endpoint';

/** Reporting context facade. It only reads: the backend calculates every report. The rest come with their screens. */
@Injectable({ providedIn: 'root' })
export class ReportingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly cashFlowEndpoint = new CashFlowApiEndpoint(this.http);

  getWeeklyCashFlow(year: number, month: number): Observable<CashFlowReport> {
    return this.cashFlowEndpoint.getWeekly(year, month);
  }

  getMonthlyCashFlow(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Observable<CashFlowReport> {
    return this.cashFlowEndpoint.getMonthly(fromYear, fromMonth, toYear, toMonth);
  }

  getCashFlowProjection(from: string, weeks: number): Observable<CashFlowReport> {
    return this.cashFlowEndpoint.getProjection(from, weeks);
  }
}
