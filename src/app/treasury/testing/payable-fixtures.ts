import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { Payable, PayableType } from '../domain/model/payable.entity';

/** A payable; override only what a test cares about. */
export function payableFixture(overrides: Partial<ConstructorParameters<typeof Payable>[0]> = {}): Payable {
  return new Payable({
    id: 1,
    concept: 'Saldo factura Electro Andes (F010-8841)',
    type: PayableType.SUPPLIER,
    totalAmount: 70800,
    currency: 'PEN',
    paidAmount: 42300,
    balance: 28500,
    supplierId: 2,
    projectId: 2,
    expenseId: 2,
    year: 2026,
    month: 11,
    week: 2,
    status: PaymentStatus.PARTIALLY_PAID,
    ...overrides,
  });
}

/** The 6 payables of DATOS.md §8 (S/ 103,850.00 still owed). */
export const datosPayables = (): Payable[] => [
  payableFixture(),
  payableFixture({ id: 2, totalAmount: 12000, paidAmount: 0, balance: 12000, status: PaymentStatus.PENDING, week: 1 }),
  payableFixture({ id: 3, totalAmount: 2800, paidAmount: 0, balance: 2800, status: PaymentStatus.PENDING, week: 1 }),
  payableFixture({ id: 4, totalAmount: 35400, paidAmount: 0, balance: 35400, status: PaymentStatus.PENDING, week: 3 }),
  payableFixture({ id: 5, totalAmount: 25150, paidAmount: 0, balance: 25150, status: PaymentStatus.PENDING, week: 3 }),
  payableFixture({ id: 6, totalAmount: 3500, paidAmount: 3500, balance: 0, status: PaymentStatus.PAID, month: 10, week: 1 }),
];
