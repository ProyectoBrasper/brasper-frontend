import { Invoice } from '../domain/model/invoice.entity';
import { InvoiceStatus } from '../domain/model/invoice-status';

/** Test invoice from DATOS.md values; override what each test needs. */
export function invoiceFixture(overrides: Partial<ConstructorParameters<typeof Invoice>[0]> = {}): Invoice {
  return new Invoice({
    id: 4,
    number: 'F001-00000047',
    issuedOn: '2026-09-10',
    purchaseOrder: 'OC-RC-118',
    projectId: 2,
    clientId: 2,
    currency: 'PEN',
    taxableBase: 120000,
    igv: 21600,
    total: 141600,
    retention: 4248,
    detraction: 16992,
    selfDetraction: false,
    advance: false,
    netAmount: 120360,
    collectedAmount: 76992,
    outstandingBalance: 64608,
    status: InvoiceStatus.PARTIALLY_COLLECTED,
    notes: '',
    ...overrides,
  });
}
