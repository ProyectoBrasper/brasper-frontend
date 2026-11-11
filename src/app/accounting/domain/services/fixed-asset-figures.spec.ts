import { CostCategory } from '../../../projects/domain/model/cost-category';
import { Expense } from '../../../expenses/domain/model/expense.entity';
import { PaymentMethod } from '../../../expenses/domain/model/payment-method';
import { PaymentStatus } from '../../../expenses/domain/model/payment-status';
import { VoucherType } from '../../../expenses/domain/model/voucher-type';
import { assetFixture } from '../../testing/fixed-asset-fixtures';
import { linkableExpenses, previewFixedAsset } from './fixed-asset-figures';

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
