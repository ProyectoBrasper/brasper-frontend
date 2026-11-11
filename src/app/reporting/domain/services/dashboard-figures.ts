import { toIsoDate } from '../../../shared/domain/model/iso-date';
import { Period } from '../../../shared/domain/model/period';

/** An alert ready to show: its i18n key and params, and the report that explains it. */
export interface DashboardAlert {
  key: string;
  params: Record<string, string>;
  link: string | null;
}

const COST_OVERRUN = 'COST_OVERRUN:';

/** The backend sends alerts as codes. An unknown one is still shown, with its code, so that it is not lost. */
export function describeAlert(code: string): DashboardAlert {
  if (code === 'NEGATIVE_PROJECTED_BALANCE') {
    return { key: 'dashboard.alert.negativeBalance', params: {}, link: '/reports/cash-flow' };
  }
  if (code.startsWith(COST_OVERRUN)) {
    return { key: 'dashboard.alert.costOverrun', params: { code: code.slice(COST_OVERRUN.length) }, link: '/reports/project-profitability' };
  }
  return { key: 'dashboard.alert.unknown', params: { code }, link: null };
}

/**
 * The date the balances are taken at (`yyyy-MM-dd`), or null when that is today: the end of the month, or today when
 * the month has not ended (the same rule as the backend).
 */
export function balancesDate(period: Period, today: Date = new Date()): string | null {
  const end = toIsoDate(new Date(period.year, period.month, 0));
  return end < toIsoDate(today) ? end : null;
}
