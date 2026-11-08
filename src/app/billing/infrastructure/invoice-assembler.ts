import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Invoice } from '../domain/model/invoice.entity';
import { InvoiceStatus } from '../domain/model/invoice-status';
import { InvoiceResource, InvoicesResponse } from './invoice.resource';

/**
 * Maps invoices from their API resource. Spring serializes BigDecimal as JSON numbers; `Number()`
 * also covers strings, just in case.
 */
export class InvoiceAssembler implements BaseAssembler<Invoice, InvoiceResource, InvoicesResponse> {
  toEntitiesFromResponse(response: InvoicesResponse): Invoice[] {
    return response.invoices.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: InvoiceResource): Invoice {
    return new Invoice({
      id: resource.id,
      number: resource.number,
      issuedOn: resource.issuedOn,
      purchaseOrder: resource.purchaseOrder ?? '',
      projectId: resource.projectId,
      clientId: resource.clientId,
      currency: resource.currency,
      taxableBase: Number(resource.taxableBase),
      igv: Number(resource.igv),
      total: Number(resource.total),
      retention: Number(resource.retention),
      detraction: Number(resource.detraction),
      selfDetraction: resource.selfDetraction,
      advance: resource.advance,
      netAmount: Number(resource.netAmount),
      collectedAmount: Number(resource.collectedAmount),
      outstandingBalance: Number(resource.outstandingBalance),
      status: resource.status as InvoiceStatus,
      notes: resource.notes ?? '',
    });
  }

  /** Invoices are never sent whole: issuing uses `IssueInvoiceCommand` (next PR). */
  toResourceFromEntity(entity: Invoice): InvoiceResource {
    return {
      id: entity.id,
      number: entity.number,
      issuedOn: entity.issuedOn,
      purchaseOrder: entity.purchaseOrder || null,
      projectId: entity.projectId,
      clientId: entity.clientId,
      currency: entity.currency,
      taxableBase: entity.taxableBase,
      igv: entity.igv,
      total: entity.total,
      retention: entity.retention,
      detraction: entity.detraction,
      selfDetraction: entity.selfDetraction,
      advance: entity.advance,
      netAmount: entity.netAmount,
      collectedAmount: entity.collectedAmount,
      outstandingBalance: entity.outstandingBalance,
      status: entity.status,
      notes: entity.notes || null,
    };
  }
}
