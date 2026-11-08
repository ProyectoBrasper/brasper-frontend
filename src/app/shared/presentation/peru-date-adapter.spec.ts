import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { PERU_DATE_FORMATS, PeruDateAdapter } from './peru-date-adapter';

describe('PeruDateAdapter', () => {
  let adapter: PeruDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PeruDateAdapter, { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
    });
    adapter = TestBed.inject(PeruDateAdapter);
  });

  it('reads dd/MM/yyyy (not the US order)', () => {
    const date = adapter.parse('04/11/2026', null);
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 10, 4]);
  });

  it('marks impossible or malformed dates as invalid', () => {
    expect(adapter.isValid(adapter.parse('31/02/2026', null) as Date)).toBe(false);
    expect(adapter.isValid(adapter.parse('2026-11-04', null) as Date)).toBe(false);
  });

  it('returns null for an empty input', () => {
    expect(adapter.parse('  ', null)).toBeNull();
  });

  it('shows dates in the input as dd/MM/yyyy', () => {
    expect(adapter.format(new Date(2026, 0, 9), PERU_DATE_FORMATS.display.dateInput)).toBe('09/01/2026');
  });
});
