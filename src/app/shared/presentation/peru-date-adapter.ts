import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

/**
 * Date adapter for `dd/MM/yyyy` (DESIGN.md §1). The native adapter parses typed text with
 * `Date.parse`, which reads 04/11/2026 as April 11 (US order); this one reads it as 4 November.
 */
@Injectable()
export class PeruDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return null;
      }
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
      if (!match) {
        return this.invalid();
      }
      const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
      const date = new Date(year, month - 1, day);
      return date.getMonth() === month - 1 && date.getDate() === day ? date : this.invalid();
    }
    return super.parse(value, parseFormat);
  }

  override format(date: Date, displayFormat: object): string {
    if ((displayFormat as { dateInput?: boolean }).dateInput) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}

/** Display formats used with {@link PeruDateAdapter}. */
export const PERU_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null },
  display: {
    dateInput: { dateInput: true },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
