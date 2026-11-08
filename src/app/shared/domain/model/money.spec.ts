import { Money } from './money';

describe('Money', () => {
  it('formats soles in es-PE as S/ 1,234.56', () => {
    // Intl separates symbol and amount with a non-breaking space (U+00A0).
    expect(new Money(1234.5, 'PEN').format('es-PE')).toBe('S/ 1,234.50');
  });

  it('defaults the currency to PEN', () => {
    expect(new Money(10).currency).toBe('PEN');
  });

  it('keeps amount and currency', () => {
    const money = new Money(99.99, 'USD');
    expect(money.amount).toBe(99.99);
    expect(money.currency).toBe('USD');
  });

  it('rejects a non-finite amount', () => {
    expect(() => new Money(Number.NaN)).toThrow();
  });
});
