import { formatInvoiceNumber, IssueInvoiceCommand, nextCorrelative } from './issue-invoice.command';

const base = {
  series: 'F001',
  correlative: 55,
  issuedOn: '2026-11-05',
  purchaseOrder: '',
  projectId: 2,
  taxableBase: 80000,
  currency: 'PEN',
  hasRetention: false,
  hasDetraction: false,
  selfDetraction: false,
  advance: false,
  notes: '',
};

describe('IssueInvoiceCommand', () => {
  it('rejects self detraction without detraction (backend rule)', () => {
    expect(() => new IssueInvoiceCommand({ ...base, selfDetraction: true })).toThrow();
    expect(() => new IssueInvoiceCommand({ ...base, hasDetraction: true, selfDetraction: true })).not.toThrow();
  });
});

describe('invoice numbers', () => {
  it('formats like the backend: series + 8-digit correlative', () => {
    expect(formatInvoiceNumber('f001', 55)).toBe('F001-00000055');
  });

  it('proposes the highest correlative of the series + 1', () => {
    const numbers = ['F001-00000031', 'F001-00000054', 'E001-00000900'];
    expect(nextCorrelative(numbers, 'F001')).toBe(55);
    expect(nextCorrelative(numbers, 'f001')).toBe(55);
    expect(nextCorrelative(numbers, 'F002')).toBe(1);
  });
});
