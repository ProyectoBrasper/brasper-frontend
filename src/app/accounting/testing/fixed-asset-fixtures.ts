import { FixedAsset } from '../domain/model/fixed-asset.entity';

/** An asset; override only what a test cares about. Defaults to the laptops of DATOS.md. */
export function assetFixture(overrides: Partial<ConstructorParameters<typeof FixedAsset>[0]> = {}): FixedAsset {
  return new FixedAsset({
    id: 1,
    description: 'Laptops de ingeniería (4)',
    acquiredOn: '2026-06-15',
    taxableBase: 20000,
    igv: 3600,
    total: 23600,
    currency: 'PEN',
    usefulLifeMonths: 40,
    expenseId: null,
    disposedOn: null,
    monthlyDepreciation: 500,
    accumulatedDepreciation: 2500,
    bookValue: 17500,
    ...overrides,
  });
}
