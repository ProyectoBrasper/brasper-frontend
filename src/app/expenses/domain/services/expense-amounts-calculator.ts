import { TaxRates } from '../../../billing/domain/services/invoice-amounts-calculator';
import { VoucherType } from '../model/voucher-type';

/** Amounts of an expense before registering it. */
export interface ExpenseAmountsPreview {
  taxableBase: number;
  igv: number;
  total: number;
}

const toCents = (amount: number) => Math.round(amount * 100);
const toBasisPoints = (rate: number) => Math.round(rate * 10000);

/**
 * Mirrors the backend `TaxBreakdown` so the preview equals what will be registered. Only an invoice
 * splits out IGV: with "amount includes IGV" the base is total ÷ (1 + rate) rounded HALF_UP and the IGV
 * is what is left; otherwise the IGV is base × rate. Any other voucher has no IGV and the total is the
 * base. Works in integer cents to avoid float errors.
 */
export class ExpenseAmountsCalculator {
  static preview(
    amount: number,
    voucherType: VoucherType,
    amountIncludesIgv: boolean,
    rates: Pick<TaxRates, 'igv'>,
  ): ExpenseAmountsPreview {
    const cents = toCents(Math.max(0, amount || 0));
    if (voucherType !== VoucherType.INVOICE) {
      return { taxableBase: cents / 100, igv: 0, total: cents / 100 };
    }
    const basisPoints = toBasisPoints(rates.igv);
    if (amountIncludesIgv) {
      const baseCents = Math.round((cents * 10000) / (10000 + basisPoints));
      return { taxableBase: baseCents / 100, igv: (cents - baseCents) / 100, total: cents / 100 };
    }
    const igvCents = Math.round((cents * basisPoints) / 10000);
    return { taxableBase: cents / 100, igv: igvCents / 100, total: (cents + igvCents) / 100 };
  }
}
