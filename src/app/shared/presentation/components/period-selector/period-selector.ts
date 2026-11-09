import { Component, inject, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Period } from '../../../domain/model/period';

/**
 * Month selector "‹ Noviembre 2026 ›" (DESIGN.md §1). Two-way bound: `[(period)]`.
 */
@Component({
  selector: 'app-period-selector',
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <div class="selector" role="group" [attr.aria-label]="'period.label' | translate">
      <button mat-icon-button type="button" (click)="onPrevious()" [attr.aria-label]="'period.previous' | translate">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <span class="label" aria-live="polite">{{ label() }}</span>
      <button mat-icon-button type="button" (click)="onNext()" [attr.aria-label]="'period.next' | translate">
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>
  `,
  styles: `
    .selector {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--brasper-radius-md);
      background: var(--mat-sys-surface);
    }
    .label {
      min-width: 130px;
      text-align: center;
      font: var(--mat-sys-label-large);
    }
  `,
})
export class PeriodSelector {
  private readonly translate = inject(TranslateService);

  readonly period = model.required<Period>();

  label(): string {
    return this.period().label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  }

  onPrevious(): void {
    this.period.set(this.period().previous());
  }

  onNext(): void {
    this.period.set(this.period().next());
  }
}
