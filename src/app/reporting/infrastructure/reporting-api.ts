import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { BalanceSheet } from '../domain/model/balance-sheet';
import { CashFlowReport } from '../domain/model/cash-flow-report';
import { IncomeStatement } from '../domain/model/income-statement';
import { ProjectProfitability } from '../domain/model/project-profitability';
import { CashFlowApiEndpoint } from './cash-flow-api-endpoint';
import { FinancialStatementsApiEndpoint } from './financial-statements-api-endpoint';
import { ProjectProfitabilityApiEndpoint } from './project-profitability-api-endpoint';

/** Reporting context facade. It only reads: the backend calculates every report. The rest come with their screens. */
@Injectable({ providedIn: 'root' })
export class ReportingApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly cashFlowEndpoint = new CashFlowApiEndpoint(this.http);
  private readonly statementsEndpoint = new FinancialStatementsApiEndpoint(this.http);
  private readonly profitabilityEndpoint = new ProjectProfitabilityApiEndpoint(this.http);

  getWeeklyCashFlow(year: number, month: number): Observable<CashFlowReport> {
    return this.cashFlowEndpoint.getWeekly(year, month);
  }

  getMonthlyCashFlow(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Observable<CashFlowReport> {
    return this.cashFlowEndpoint.getMonthly(fromYear, fromMonth, toYear, toMonth);
  }

  getCashFlowProjection(from: string, weeks: number): Observable<CashFlowReport> {
    return this.cashFlowEndpoint.getProjection(from, weeks);
  }

  getIncomeStatement(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Observable<IncomeStatement> {
    return this.statementsEndpoint.getIncomeStatement(fromYear, fromMonth, toYear, toMonth);
  }

  getBalanceSheet(year: number, month: number): Observable<BalanceSheet> {
    return this.statementsEndpoint.getBalanceSheet(year, month);
  }

  getPortfolioProfitability(year: number, month: number): Observable<ProjectProfitability[]> {
    return this.profitabilityEndpoint.getPortfolio(year, month);
  }
}
