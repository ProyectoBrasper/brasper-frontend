import { Invoice } from '../model/invoice.entity';
import { InvoicePayment, InvoicePaymentType } from '../model/invoice-payment.entity';

/**
 * Payment types that make sense for an invoice: the net deposit always; the detraction deposit only
 * if it has a detraction; the retention certificate only if it has a retention.
 */
export function applicablePaymentTypes(invoice: Invoice): InvoicePaymentType[] {
  return [
    InvoicePaymentType.NET_DEPOSIT,
    ...(invoice.detraction > 0 ? [InvoicePaymentType.DETRACTION_DEPOSIT] : []),
    ...(invoice.retention > 0 ? [InvoicePaymentType.RETENTION_CERTIFICATE] : []),
  ];
}

/** Backend rule: every type except the retention certificate needs the bank account it went into. */
export function needsBankAccount(type: InvoicePaymentType): boolean {
  return type !== InvoicePaymentType.RETENTION_CERTIFICATE;
}

/**
 * Amount proposed for a new payment of `type`: what is still pending of that part (net amount,
 * detraction or retention) minus what was already collected with that type, never above the
 * outstanding balance (the backend rejects more than that). Works in cents.
 */
export function suggestedPaymentAmount(
  invoice: Invoice,
  payments: readonly InvoicePayment[],
  type: InvoicePaymentType,
): number {
  const cents = (amount: number) => Math.round(amount * 100);
  const expected = {
    [InvoicePaymentType.NET_DEPOSIT]: invoice.netAmount,
    [InvoicePaymentType.DETRACTION_DEPOSIT]: invoice.detraction,
    [InvoicePaymentType.RETENTION_CERTIFICATE]: invoice.retention,
  }[type];
  const alreadyCollected = payments.filter((p) => p.type === type).reduce((sum, p) => sum + cents(p.amount), 0);
  const pending = Math.max(0, cents(expected) - alreadyCollected);
  return Math.min(pending, Math.max(0, cents(invoice.outstandingBalance))) / 100;
}
