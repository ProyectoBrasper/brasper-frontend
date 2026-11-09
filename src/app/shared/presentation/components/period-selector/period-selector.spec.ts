import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Period } from '../../../domain/model/period';
import { PeriodSelector } from './period-selector';

@Component({
  imports: [PeriodSelector],
  template: '<app-period-selector [(period)]="period" />',
})
class Host {
  readonly period = signal(new Period(2026, 12));
}

describe('PeriodSelector', () => {
  it('moves the bound period across years and shows its label', () => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideTranslateService({ lang: 'es' })] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const [previous, next] = Array.from(element.querySelectorAll('button'));

    expect(element.querySelector('.label')?.textContent?.trim()).toBe('Diciembre 2026');
    next.click();
    fixture.detectChanges();
    expect([fixture.componentInstance.period().year, fixture.componentInstance.period().month]).toEqual([2027, 1]);
    previous.click();
    previous.click();
    fixture.detectChanges();
    expect(element.querySelector('.label')?.textContent?.trim()).toBe('Noviembre 2026');
  });
});
