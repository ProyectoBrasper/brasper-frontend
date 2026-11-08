import { InvoicePayment, InvoicePaymentType } from '../model/invoice-payment.entity';
import { InvoiceStatus } from '../model/invoice-status';
import { invoiceFixture } from '../../testing/invoice-fixtures';
import { applicablePaymentTypes, needsBankAccount, suggestedPaymentAmount } from './payment-rules';

const payment = (type: InvoicePaymentType, amount: number) =>
  new InvoicePayment({ id: 0, invoiceId: 4, receivedOn: '2026-10-06', amount, type, bankAccountId: 1, reference: '' });

describe('payment rules', () => {
  // F001-00000047 (DATOS.md): total 141,600; retention 4,248; detraction 16,992; net 120,360;
  // collected 60,000 net + 16,992 detraction; outstanding 64,608.
  const invoice = invoiceFixture();
  const payments = [
    payment(InvoicePaymentType.NET_DEPOSIT, 60000),
    payment(InvoicePaymentType.DETRACTION_DEPOSIT, 16992),
  ];

  it('offers only the types that apply to the invoice', () => {
    expect(applicablePaymentTypes(invoice)).toEqual([
      InvoicePaymentType.NET_DEPOSIT,
      InvoicePaymentType.DETRACTION_DEPOSIT,
      InvoicePaymentType.RETENTION_CERTIFICATE,
    ]);
    expect(applicablePaymentTypes(invoiceFixture({ retention: 0, detraction: 0 }))).toEqual([
      InvoicePaymentType.NET_DEPOSIT,
    ]);
  });

  it('suggests what is still pending of each part', () => {
    expect(suggestedPaymentAmount(invoice, payments, InvoicePaymentType.NET_DEPOSIT)).toBe(60360);
    expect(suggestedPaymentAmount(invoice, payments, InvoicePaymentType.RETENTION_CERTIFICATE)).toBe(4248);
    expect(suggestedPaymentAmount(invoice, payments, InvoicePaymentType.DETRACTION_DEPOSIT)).toBe(0);
  });

  it('never suggests more than the outstanding balance', () => {
    const almostPaid = invoiceFixture({ outstandingBalance: 100, status: InvoiceStatus.PARTIALLY_COLLECTED });
    expect(suggestedPaymentAmount(almostPaid, [], InvoicePaymentType.NET_DEPOSIT)).toBe(100);
  });

  it('requires a bank account for deposits only', () => {
    expect(needsBankAccount(InvoicePaymentType.NET_DEPOSIT)).toBe(true);
    expect(needsBankAccount(InvoicePaymentType.DETRACTION_DEPOSIT)).toBe(true);
    expect(needsBankAccount(InvoicePaymentType.RETENTION_CERTIFICATE)).toBe(false);
  });
});
