/**
 * Invoice collection status (backend `InvoiceStatus`): pending → partially collected → collected;
 * an invoice without payments can be voided.
 */
export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARTIALLY_COLLECTED = 'PARTIALLY_COLLECTED',
  COLLECTED = 'COLLECTED',
  VOIDED = 'VOIDED',
}

export const INVOICE_STATUSES: readonly InvoiceStatus[] = Object.values(InvoiceStatus);
