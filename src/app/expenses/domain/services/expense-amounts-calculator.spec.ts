import { VoucherType } from '../model/voucher-type';
import { ExpenseAmountsCalculator } from './expense-amounts-calculator';

const IGV = { igv: 0.18 };

describe('ExpenseAmountsCalculator', () => {
  it('adds IGV on top of the base for an invoice (DATOS.md expense 1: 120,000 + 21,600)', () => {
    expect(ExpenseAmountsCalculator.preview(120000, VoucherType.INVOICE, false, IGV)).toEqual({
      taxableBase: 120000,
      igv: 21600,
      total: 141600,
    });
  });

  it('splits the IGV out of the total when the amount includes it', () => {
    expect(ExpenseAmountsCalculator.preview(141600, VoucherType.INVOICE, true, IGV)).toEqual({
      taxableBase: 120000,
      igv: 21600,
      total: 141600,
    });
  });

  it('keeps base + IGV equal to the total when the division does not come out exact', () => {
    const preview = ExpenseAmountsCalculator.preview(100, VoucherType.INVOICE, true, IGV);
    expect(preview.taxableBase).toBe(84.75);
    expect(preview.igv).toBe(15.25);
    expect(Math.round((preview.taxableBase + preview.igv) * 100) / 100).toBe(100);
  });

  it.each([VoucherType.SALES_RECEIPT, VoucherType.FEE_RECEIPT, VoucherType.NO_VOUCHER])(
    'has no IGV with %s, even if "includes IGV" is on',
    (voucherType) => {
      expect(ExpenseAmountsCalculator.preview(8000, voucherType, true, IGV)).toEqual({
        taxableBase: 8000,
        igv: 0,
        total: 8000,
      });
    },
  );

  it('is zero without an amount', () => {
    expect(ExpenseAmountsCalculator.preview(NaN, VoucherType.INVOICE, false, IGV)).toEqual({
      taxableBase: 0,
      igv: 0,
      total: 0,
    });
  });
});
