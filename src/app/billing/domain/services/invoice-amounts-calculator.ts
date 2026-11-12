/** Tax rates as fractions (0.18 = 18 %), like the backend `TaxRates`. */
export interface TaxRates {
  igv: number;
  detraction: number;
  retention: number;
}

/** Rates the backend uses when no tax parameters are configured (`TaxRates.standard()`). */
export const STANDARD_TAX_RATES: TaxRates = { igv: 0.18, detraction: 0.12, retention: 0.03 };

/** Amounts of an invoice before issuing it. */
export interface InvoiceAmountsPreview {
  taxableBase: number;
  igv: number;
  total: number;
  retention: number;
  detraction: number;
  netAmount: number;
}

const toCents = (amount: number) => Math.round(amount * 100);
const toBasisPoints = (rate: number) => Math.round(rate * 10000);
/** cents × rate, rounded HALF_UP to cents (Math.round is half-up for positive values). */
const applyRate = (cents: number, basisPoints: number) => Math.round((cents * basisPoints) / 10000);

/**
 * Mirrors the backend `Invoice` constructor so the preview equals what will be issued:
 * IGV = base × rate (2 decimals, HALF_UP); total = base + IGV; retention = total × rate (2 decimals);
 * detraction = total × rate rounded to 2 decimals and then to whole units (`roundToUnits`);
 * net = total − retention − detraction. Works in integer cents to avoid float errors.
 */
export class InvoiceAmountsCalculator {
  static preview(
    taxableBase: number,
    hasRetention: boolean,
    hasDetraction: boolean,
    rates: TaxRates,
  ): InvoiceAmountsPreview {
    const baseCents = toCents(Math.max(0, taxableBase || 0));
    const igvCents = applyRate(baseCents, toBasisPoints(rates.igv));
    const totalCents = baseCents + igvCents;
    const retentionCents = hasRetention ? applyRate(totalCents, toBasisPoints(rates.retention)) : 0;
    const detractionCents = hasDetraction
      ? Math.round(applyRate(totalCents, toBasisPoints(rates.detraction)) / 100) * 100
      : 0;
    return {
      taxableBase: baseCents / 100,
      igv: igvCents / 100,
      total: totalCents / 100,
      retention: retentionCents / 100,
      detraction: detractionCents / 100,
      netAmount: (totalCents - retentionCents - detractionCents) / 100,
    };
  }
}
