import { CostCategory } from '../../projects/domain/model/cost-category';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Expense } from '../domain/model/expense.entity';
import { PaymentMethod } from '../domain/model/payment-method';
import { PaymentStatus } from '../domain/model/payment-status';
import { VoucherType } from '../domain/model/voucher-type';
import { ExpenseResource, ExpensesResponse } from './expense.resource';

/**
 * Maps expenses from their resource. Spring serializes BigDecimal as JSON numbers; `Number()` also
 * covers strings. Expenses are never sent whole: registering and correcting use their own requests.
 */
export class ExpenseAssembler implements BaseAssembler<Expense, ExpenseResource, ExpensesResponse> {
  toEntitiesFromResponse(response: ExpensesResponse): Expense[] {
    return response.expenses.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: ExpenseResource): Expense {
    return new Expense({
      id: resource.id,
      spentOn: resource.spentOn,
      projectId: resource.projectId ?? null,
      supplierId: resource.supplierId ?? null,
      category: resource.category as CostCategory,
      description: resource.description ?? '',
      voucherType: resource.voucherType as VoucherType,
      voucherNumber: resource.voucherNumber ?? '',
      taxableBase: Number(resource.taxableBase),
      igv: Number(resource.igv),
      total: Number(resource.total),
      currency: resource.currency,
      paymentMethod: resource.paymentMethod as PaymentMethod,
      bankAccountId: resource.bankAccountId ?? null,
      partnerId: resource.partnerId ?? null,
      paymentStatus: resource.paymentStatus as PaymentStatus,
      annulled: resource.annulled,
    });
  }

  toResourceFromEntity(entity: Expense): ExpenseResource {
    return {
      id: entity.id,
      spentOn: entity.spentOn,
      projectId: entity.projectId,
      supplierId: entity.supplierId,
      category: entity.category,
      description: entity.description || null,
      voucherType: entity.voucherType,
      voucherNumber: entity.voucherNumber || null,
      taxableBase: entity.taxableBase,
      igv: entity.igv,
      total: entity.total,
      currency: entity.currency,
      paymentMethod: entity.paymentMethod,
      bankAccountId: entity.bankAccountId,
      partnerId: entity.partnerId,
      paymentStatus: entity.paymentStatus,
      annulled: entity.annulled,
    };
  }
}
