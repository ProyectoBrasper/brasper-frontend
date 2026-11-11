import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { CashFlowAmounts, CashFlowLine, CashFlowReport } from '../domain/model/cash-flow-report';

/** Backend `CashFlowReportResource.Line`. */
export interface CashFlowLineResource {
  label: string;
  startDate: string;
  endDate: string;
  projected: boolean;
  openingBalance: number;
  inflows: CashFlowAmounts;
  outflows: CashFlowAmounts;
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
  closingBalance: number;
}

/** Backend `CashFlowReportResource`. */
export interface CashFlowReportResource {
  from: string;
  to: string;
  finalBalance: number;
  hasNegativeBalance: boolean;
  lines: CashFlowLineResource[];
}

/** `Number()` covers BigDecimal sent as a string. */
const toNumbers = (amounts: CashFlowAmounts): CashFlowAmounts =>
  Object.fromEntries(Object.entries(amounts).map(([concept, amount]) => [concept, Number(amount)]));

/** Maps the cash flow from its resource. */
export class CashFlowReportAssembler {
  toEntityFromResource(resource: CashFlowReportResource): CashFlowReport {
    return new CashFlowReport({
      from: resource.from,
      to: resource.to,
      finalBalance: Number(resource.finalBalance),
      hasNegativeBalance: resource.hasNegativeBalance,
      lines: resource.lines.map(
        (line) =>
          new CashFlowLine({
            startDate: line.startDate,
            endDate: line.endDate,
            projected: line.projected,
            openingBalance: Number(line.openingBalance),
            inflows: toNumbers(line.inflows),
            outflows: toNumbers(line.outflows),
            totalInflows: Number(line.totalInflows),
            totalOutflows: Number(line.totalOutflows),
            netFlow: Number(line.netFlow),
            closingBalance: Number(line.closingBalance),
          }),
      ),
    });
  }
}

/**
 * Client for `/reports/cash-flow` (admin, management and accounting). It is a read model, not a collection, so it does
 * not extend `BaseApiEndpoint`.
 */
export class CashFlowApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderReportsEndpointPath}/cash-flow`;
  private readonly assembler = new CashFlowReportAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  /** `GET /reports/cash-flow/weekly`: the weeks of one month. */
  getWeekly(year: number, month: number): Observable<CashFlowReport> {
    return this.get('weekly', new HttpParams().set('year', year).set('month', month));
  }

  /** `GET /reports/cash-flow/monthly`: one line per month, both ends included, at most 24 months. */
  getMonthly(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Observable<CashFlowReport> {
    const params = new HttpParams().set('fromYear', fromYear).set('fromMonth', fromMonth).set('toYear', toYear).set('toMonth', toMonth);
    return this.get('monthly', params);
  }

  /** `GET /reports/cash-flow/projection`: `weeks` weeks (1 to 52) starting with the one that contains `from`. */
  getProjection(from: string, weeks: number): Observable<CashFlowReport> {
    return this.get('projection', new HttpParams().set('from', from).set('weeks', weeks));
  }

  private get(path: string, params: HttpParams): Observable<CashFlowReport> {
    return this.http.get<CashFlowReportResource>(`${this.endpointUrl}/${path}`, { params }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch cash flow')),
    );
  }
}
