import { CostCategory } from '../../projects/domain/model/cost-category';
import { Expense } from '../domain/model/expense.entity';
import { PaymentMethod } from '../domain/model/payment-method';
import { PaymentStatus } from '../domain/model/payment-status';
import { VoucherType } from '../domain/model/voucher-type';

/** An active expense paid from a bank account; override only what a test cares about. */
export function expenseFixture(overrides: Partial<ConstructorParameters<typeof Expense>[0]> = {}): Expense {
  return new Expense({
    id: 1,
    spentOn: '2026-10-02',
    projectId: 1,
    supplierId: 1,
    category: CostCategory.MATERIALS,
    description: 'Estructuras metálicas',
    voucherType: VoucherType.INVOICE,
    voucherNumber: 'E001-2210',
    taxableBase: 120000,
    igv: 21600,
    total: 141600,
    currency: 'PEN',
    paymentMethod: PaymentMethod.BANK_ACCOUNT,
    bankAccountId: 1,
    partnerId: null,
    paymentStatus: PaymentStatus.PAID,
    annulled: false,
    ...overrides,
  });
}
