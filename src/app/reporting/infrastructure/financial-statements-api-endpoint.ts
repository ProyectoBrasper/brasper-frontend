import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { BalanceSheet, BalanceSheetAmounts } from '../domain/model/balance-sheet';
import { IncomeStatement } from '../domain/model/income-statement';

/** Backend `IncomeStatementResource`. */
export interface IncomeStatementResource {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  revenue: number;
  directCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  financialExpenses: number;
  profitBeforeTax: number;
  incomeTax: number;
  netProfit: number;
}

/** Backend `BalanceSheetResource`. */
export interface BalanceSheetResource {
  asOf: string;
  assets: BalanceSheetAmounts;
  liabilities: BalanceSheetAmounts;
  equity: BalanceSheetAmounts;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  difference: number;
  balanced: boolean;
}

/** `Number()` covers BigDecimal sent as a string. */
const toNumbers = (amounts: BalanceSheetAmounts): BalanceSheetAmounts =>
  Object.fromEntries(Object.entries(amounts).map(([code, amount]) => [code, Number(amount)]));

/** Maps the income statement from its resource. */
export class IncomeStatementAssembler {
  toEntityFromResource(resource: IncomeStatementResource): IncomeStatement {
    return new IncomeStatement({
      revenue: Number(resource.revenue),
      directCosts: Number(resource.directCosts),
      grossProfit: Number(resource.grossProfit),
      operatingExpenses: Number(resource.operatingExpenses),
      operatingProfit: Number(resource.operatingProfit),
      financialExpenses: Number(resource.financialExpenses),
      profitBeforeTax: Number(resource.profitBeforeTax),
      incomeTax: Number(resource.incomeTax),
      netProfit: Number(resource.netProfit),
    });
  }
}

/** Maps the balance sheet from its resource. */
export class BalanceSheetAssembler {
  toEntityFromResource(resource: BalanceSheetResource): BalanceSheet {
    return new BalanceSheet({
      asOf: resource.asOf,
      assets: toNumbers(resource.assets),
      liabilities: toNumbers(resource.liabilities),
      equity: toNumbers(resource.equity),
      totalAssets: Number(resource.totalAssets),
      totalLiabilities: Number(resource.totalLiabilities),
      totalEquity: Number(resource.totalEquity),
      difference: Number(resource.difference),
      balanced: resource.balanced,
    });
  }
}

/** Client for `/reports/income-statement` and `/reports/balance-sheet` (admin, management and accounting). */
export class FinancialStatementsApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderReportsEndpointPath}`;
  private readonly incomeStatementAssembler = new IncomeStatementAssembler();
  private readonly balanceSheetAssembler = new BalanceSheetAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  /** The first month must not come after the last (400). */
  getIncomeStatement(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Observable<IncomeStatement> {
    const params = new HttpParams().set('fromYear', fromYear).set('fromMonth', fromMonth).set('toYear', toYear).set('toMonth', toMonth);
    return this.http.get<IncomeStatementResource>(`${this.endpointUrl}/income-statement`, { params }).pipe(
      map((resource) => this.incomeStatementAssembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch income statement')),
    );
  }

  /** The position at the end of a month. */
  getBalanceSheet(year: number, month: number): Observable<BalanceSheet> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<BalanceSheetResource>(`${this.endpointUrl}/balance-sheet`, { params }).pipe(
      map((resource) => this.balanceSheetAssembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch balance sheet')),
    );
  }
}
