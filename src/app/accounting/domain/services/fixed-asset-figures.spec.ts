import { CostCategory } from '../../../projects/domain/model/cost-category';
import { Expense } from '../../../expenses/domain/model/expense.entity';
import { PaymentMethod } from '../../../expenses/domain/model/payment-method';
import { PaymentStatus } from '../../../expenses/domain/model/payment-status';
import { VoucherType } from '../../../expenses/domain/model/voucher-type';
import { Period } from '../../../shared/domain/model/period';
import { EntrySource } from '../model/journal-entry.entity';
import { assetFixture } from '../../testing/fixed-asset-fixtures';
import { entryFixture } from '../../testing/journal-entry-fixtures';
import {
  depreciationEntry,
  isBackdatedDisposal,
  isCurrentMonth,
  isFutureMonth,
  lastDayOf,
  linkableExpenses,
  monthlyCharge,
  previewDisposal,
  previewFixedAsset,
} from './fixed-asset-figures';

const expense = (id: number, spentOn: string, annulled = false) =>
  new Expense({
    id,
    spentOn,
    projectId: null,
    supplierId: null,
    category: CostCategory.OTHER,
    description: 'Laptop',
    voucherType: VoucherType.INVOICE,
    voucherNumber: 'F001-1',
    taxableBase: 1000,
    igv: 180,
    total: 1180,
    currency: 'PEN',
    paymentMethod: PaymentMethod.BANK_ACCOUNT,
    bankAccountId: 1,
    partnerId: null,
    paymentStatus: PaymentStatus.PAID,
    annulled,
  });

describe('previewFixedAsset', () => {
  it('adds the IGV to the base and spreads the base over the useful life', () => {
    expect(previewFixedAsset(20000, 0.18, 40)).toEqual({ igv: 3600, total: 23600, monthlyDepreciation: 500 });
  });

  it('rounds half up to cents, like the backend', () => {
    expect(previewFixedAsset(1000, 0.18, 3).monthlyDepreciation).toBe(333.33);
    expect(previewFixedAsset(0.25, 0.18, 1).igv).toBe(0.05);
  });

  it('previews no depreciation without a useful life and nothing without a base', () => {
    expect(previewFixedAsset(1000, 0.18, 0).monthlyDepreciation).toBe(0);
    expect(previewFixedAsset(0, 0.18, 12)).toEqual({ igv: 0, total: 0, monthlyDepreciation: 0 });
  });
});

describe('linkableExpenses', () => {
  it('leaves out annulled expenses and those another asset already took, latest first', () => {
    const expenses = [expense(1, '2026-01-10'), expense(2, '2026-03-10'), expense(3, '2026-02-10', true), expense(4, '2026-02-10')];
    const result = linkableExpenses(expenses, [assetFixture({ expenseId: 1 }), assetFixture({ expenseId: null })]);
    expect(result.map((e) => e.id)).toEqual([2, 4]);
  });
});

describe('monthlyCharge (accumulated at the end of the month minus the month before)', () => {
  it('does not charge the acquisition month and charges from the next one', () => {
    expect(monthlyCharge([assetFixture()], new Period(2026, 6))).toEqual({ total: 0, assets: 0 });
    expect(monthlyCharge([assetFixture()], new Period(2026, 7))).toEqual({ total: 500, assets: 1 });
  });

  it('adds up every asset', () => {
    const assets = [assetFixture(), assetFixture({ id: 2, taxableBase: 28000, usefulLifeMonths: 56 })];
    expect(monthlyCharge(assets, new Period(2026, 10))).toEqual({ total: 1000, assets: 2 });
  });

  it('gives the last month the rounding remainder and nothing after it', () => {
    const asset = assetFixture({ acquiredOn: '2026-01-10', taxableBase: 1000, usefulLifeMonths: 3, monthlyDepreciation: 333.33 });
    expect(monthlyCharge([asset], new Period(2026, 3)).total).toBe(333.33);
    expect(monthlyCharge([asset], new Period(2026, 4)).total).toBe(333.34);
    expect(monthlyCharge([asset], new Period(2026, 5)).total).toBe(0);
  });

  it('charges the month of the disposal but not the ones after it', () => {
    const asset = assetFixture({ disposedOn: '2026-09-15' });
    expect(monthlyCharge([asset], new Period(2026, 9)).total).toBe(500);
    expect(monthlyCharge([asset], new Period(2026, 10)).total).toBe(0);
  });
});

describe('depreciationEntry', () => {
  it('finds the entry of the month, even a reversed one (the backend will not post it again)', () => {
    const entry = entryFixture({ source: EntrySource.DEPRECIATION, reversed: true });
    expect(depreciationEntry([entryFixture(), entry])).toBe(entry);
  });

  it('is undefined when the month was not posted', () => {
    expect(depreciationEntry([entryFixture()])).toBeUndefined();
  });
});

describe('where a month falls', () => {
  const today = new Date(2026, 10, 10);

  it('tells the last day of a month', () => {
    expect(lastDayOf(new Period(2026, 2))).toBe('2026-02-28');
  });

  it('tells a future month across years', () => {
    expect(isFutureMonth(new Period(2026, 12), today)).toBe(true);
    expect(isFutureMonth(new Period(2027, 1), today)).toBe(true);
    expect(isFutureMonth(new Period(2026, 11), today)).toBe(false);
  });

  it('tells the current month', () => {
    expect(isCurrentMonth(new Period(2026, 11), today)).toBe(true);
    expect(isCurrentMonth(new Period(2026, 10), today)).toBe(false);
  });
});

describe('previewDisposal', () => {
  it('splits the cost into the accumulated at that date and the loss', () => {
    expect(previewDisposal(assetFixture(), '2026-10-20')).toEqual({ accumulated: 2000, loss: 18000, cost: 20000 });
  });

  it('has no accumulated in the acquisition month, so the whole cost is a loss', () => {
    expect(previewDisposal(assetFixture(), '2026-06-30')).toEqual({ accumulated: 0, loss: 20000, cost: 20000 });
  });

  it('has no loss once fully depreciated', () => {
    expect(previewDisposal(assetFixture(), '2030-01-15')).toEqual({ accumulated: 20000, loss: 0, cost: 20000 });
  });
});

describe('isBackdatedDisposal', () => {
  const today = new Date(2026, 10, 10);

  it('flags a month before the current one', () => {
    expect(isBackdatedDisposal('2026-10-31', today)).toBe(true);
  });

  it('does not flag the current month', () => {
    expect(isBackdatedDisposal('2026-11-01', today)).toBe(false);
  });
});
