import { Pipe, PipeTransform } from '@angular/core';
import { Money } from '../domain/model/money';

/**
 * `{{ project.budget | money: project.currency }}` → `S/ 850,000.00`. Empty for null amounts.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency = 'PEN'): string {
    return amount === null || amount === undefined ? '' : new Money(amount, currency).format('es-PE');
  }
}
