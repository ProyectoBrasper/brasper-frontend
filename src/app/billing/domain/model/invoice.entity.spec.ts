import { invoiceFixture } from '../../testing/invoice-fixtures';
import { InvoiceStatus } from './invoice-status';

describe('Invoice', () => {
  it('is collectable while it has a balance and is not voided', () => {
    expect(invoiceFixture().isCollectable()).toBe(true);
    expect(invoiceFixture({ outstandingBalance: 0, status: InvoiceStatus.COLLECTED }).isCollectable()).toBe(false);
    expect(invoiceFixture({ status: InvoiceStatus.VOIDED, collectedAmount: 0 }).isCollectable()).toBe(false);
  });

  it('can be voided only without payments (backend rule)', () => {
    expect(invoiceFixture().canBeVoided()).toBe(false);
    expect(invoiceFixture({ collectedAmount: 0, status: InvoiceStatus.PENDING }).canBeVoided()).toBe(true);
    expect(invoiceFixture({ collectedAmount: 0, status: InvoiceStatus.VOIDED }).canBeVoided()).toBe(false);
  });
});
