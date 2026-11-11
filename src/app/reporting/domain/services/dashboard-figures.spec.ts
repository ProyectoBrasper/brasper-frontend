import { Period } from '../../../shared/domain/model/period';
import { balancesDate, describeAlert } from './dashboard-figures';

describe('describeAlert', () => {
  it('points a negative balance to the cash flow', () => {
    expect(describeAlert('NEGATIVE_PROJECTED_BALANCE')).toEqual({
      key: 'dashboard.alert.negativeBalance',
      params: {},
      link: '/reports/cash-flow',
    });
  });

  it('names the project of a cost overrun and points to the profitability', () => {
    expect(describeAlert('COST_OVERRUN:002BR-FEB-2026')).toEqual({
      key: 'dashboard.alert.costOverrun',
      params: { code: '002BR-FEB-2026' },
      link: '/reports/project-profitability',
    });
  });

  it('keeps an alert it does not know, with its code and no link', () => {
    expect(describeAlert('SOMETHING_NEW')).toEqual({ key: 'dashboard.alert.unknown', params: { code: 'SOMETHING_NEW' }, link: null });
  });
});

describe('balancesDate', () => {
  const today = new Date(2026, 10, 10);

  it('is the end of a month that ended', () => {
    expect(balancesDate(new Period(2026, 10), today)).toBe('2026-10-31');
  });

  it('is today for the current month and a future one', () => {
    expect(balancesDate(new Period(2026, 11), today)).toBeNull();
    expect(balancesDate(new Period(2027, 1), today)).toBeNull();
  });
});
