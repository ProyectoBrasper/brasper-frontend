import { InvoiceAmountsCalculator, STANDARD_TAX_RATES } from './invoice-amounts-calculator';

const preview = (base: number, retention: boolean, detraction: boolean) =>
  InvoiceAmountsCalculator.preview(base, retention, detraction, STANDARD_TAX_RATES);

describe('InvoiceAmountsCalculator', () => {
  // [number, base, retention, detraction] → [igv, total, retention, detraction, net] (DATOS.md §5)
  const datos: [string, number, boolean, boolean, number[]][] = [
    ['F001-00000031', 200000, false, true, [36000, 236000, 0, 28320, 207680]],
    ['F001-00000038', 180000, false, true, [32400, 212400, 0, 25488, 186912]],
    ['F001-00000044', 100000, false, true, [18000, 118000, 0, 14160, 103840]],
    ['F001-00000047', 120000, true, true, [21600, 141600, 4248, 16992, 120360]],
    ['F001-00000048', 50000, false, false, [9000, 59000, 0, 0, 59000]],
    ['F001-00000050', 150000, false, true, [27000, 177000, 0, 21240, 155760]],
    ['F001-00000053', 250000, false, true, [45000, 295000, 0, 35400, 259600]],
    ['F001-00000054', 100000, true, true, [18000, 118000, 3540, 14160, 100300]],
  ];

  it.each(datos)('reproduces %s from DATOS.md', (_number, base, retention, detraction, expected) => {
    const result = preview(base, retention, detraction);
    expect([result.igv, result.total, result.retention, result.detraction, result.netAmount]).toEqual(expected);
  });

  it('matches the issue-invoice mockup example', () => {
    expect(preview(80000, true, true)).toEqual({
      taxableBase: 80000,
      igv: 14400,
      total: 94400,
      retention: 2832,
      detraction: 11328,
      netAmount: 80240,
    });
  });

  it('rounds IGV and retention HALF_UP to cents, like BigDecimal', () => {
    // 12.25 × 18 % = 2.205 → 2.21 ; total 14.46 × 3 % = 0.4338 → 0.43
    const result = preview(12.25, true, false);
    expect([result.igv, result.total, result.retention]).toEqual([2.21, 14.46, 0.43]);
  });

  it('rounds the detraction to whole soles', () => {
    // total 1,180.00 × 12 % = 141.60 → 142 ; total 1,239.00 × 12 % = 148.68 → 149
    expect(preview(1000, false, true).detraction).toBe(142);
    expect(preview(1050, false, true).detraction).toBe(149);
  });

  it('avoids float noise on decimal bases', () => {
    const result = preview(0.1 + 0.2, false, false);
    expect(result.taxableBase).toBe(0.3);
    expect(result.total).toBe(0.35);
  });

  it('treats an empty or negative base as zero', () => {
    expect(preview(Number.NaN, true, true).total).toBe(0);
    expect(preview(-5, false, false).total).toBe(0);
  });
});
