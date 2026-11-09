import { CostCategory } from '../../projects/domain/model/cost-category';
import { PaymentMethod } from '../domain/model/payment-method';
import { PaymentStatus } from '../domain/model/payment-status';
import { VoucherType } from '../domain/model/voucher-type';
import { ExpenseAssembler } from './expense-assembler';
import { ExpenseResource } from './expense.resource';
import { SupplierAssembler } from './supplier-assembler';
import { SupplierType } from '../domain/model/supplier-type';
import { Supplier } from '../domain/model/supplier.entity';

describe('ExpenseAssembler', () => {
  const assembler = new ExpenseAssembler();
  const resource: ExpenseResource = {
    id: 6,
    spentOn: '2026-10-25',
    projectId: 2,
    supplierId: null,
    category: 'MATERIALS',
    description: null,
    voucherType: 'NO_VOUCHER',
    voucherNumber: null,
    taxableBase: 2400,
    igv: 0,
    total: 2400,
    currency: 'PEN',
    paymentMethod: 'PARTNER_CONTRIBUTION',
    bankAccountId: null,
    partnerId: 1,
    paymentStatus: 'PAID',
    annulled: false,
  };

  it('maps an expense without supplier, voucher number or description', () => {
    const expense = assembler.toEntityFromResource(resource);
    expect(expense.category).toBe(CostCategory.MATERIALS);
    expect(expense.voucherType).toBe(VoucherType.NO_VOUCHER);
    expect(expense.paymentMethod).toBe(PaymentMethod.PARTNER_CONTRIBUTION);
    expect(expense.paymentStatus).toBe(PaymentStatus.PAID);
    expect([expense.supplierId, expense.description, expense.voucherNumber]).toEqual([null, '', '']);
  });

  it('converts amounts that arrive as strings', () => {
    const expense = assembler.toEntityFromResource({ ...resource, total: '141600.00' as unknown as number });
    expect(expense.total).toBe(141600);
  });

  it('tells direct costs from general expenses and credit-giving vouchers from the rest', () => {
    expect(assembler.toEntityFromResource(resource).isDirectCost()).toBe(true);
    expect(assembler.toEntityFromResource({ ...resource, projectId: null }).isDirectCost()).toBe(false);
    expect(assembler.toEntityFromResource(resource).generatesTaxCredit()).toBe(false);
    expect(assembler.toEntityFromResource({ ...resource, voucherType: 'INVOICE' }).generatesTaxCredit()).toBe(true);
  });
});

describe('SupplierAssembler', () => {
  const assembler = new SupplierAssembler();

  it('turns a missing RUC and phone into empty strings and back into null', () => {
    const supplier = assembler.toEntityFromResource({
      id: 3,
      businessName: 'Marco Antonio Huamán Ríos',
      ruc: null,
      type: 'NATURAL_PERSON',
      phone: null,
    });
    expect([supplier.ruc, supplier.phone]).toEqual(['', '']);
    expect(assembler.toResourceFromEntity(supplier)).toMatchObject({ ruc: null, phone: null });
  });

  it('keeps the type of the supplier', () => {
    const supplier = new Supplier({ id: 1, businessName: 'X S.A.C.', ruc: '20601112221', type: SupplierType.COMPANY, phone: '' });
    expect(assembler.toResourceFromEntity(supplier).type).toBe('COMPANY');
  });
});
