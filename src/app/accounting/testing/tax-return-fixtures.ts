import { TaxReturn, TaxReturnStatus } from '../domain/model/tax-return.entity';

/** A return; override only what a test cares about. Defaults to September 2026 of DATOS.md, paid. */
export function taxReturnFixture(overrides: Partial<ConstructorParameters<typeof TaxReturn>[0]> = {}): TaxReturn {
  return new TaxReturn({
    id: 1,
    year: 2026,
    month: 9,
    outputIgv: 48600,
    inputIgv: 30200,
    carriedCredit: 0,
    igvPayable: 18400,
    incomeTaxPrepayment: 4050,
    totalPayable: 22450,
    currency: 'PEN',
    status: TaxReturnStatus.PAID,
    paidOn: '2026-10-14',
    bankAccountId: 1,
    ...overrides,
  });
}

/** October 2026 prepared from the seeded entries: 63,000 − 21,600 − 0 + 5,250 = 46,650. */
export const octoberDraft = (): TaxReturn =>
  taxReturnFixture({
    id: 2,
    month: 10,
    outputIgv: 63000,
    inputIgv: 21600,
    carriedCredit: 0,
    igvPayable: 41400,
    incomeTaxPrepayment: 5250,
    totalPayable: 46650,
    status: TaxReturnStatus.DRAFT,
    paidOn: null,
    bankAccountId: null,
  });
