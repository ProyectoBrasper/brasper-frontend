import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { statusColor, statusIcon } from './status-color';

/**
 * Tonal pill with icon and translated label for a status (`status.<STATUS>` i18n key).
 */
@Component({
  selector: 'app-status-chip',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <span [class]="'chip ' + color()">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      {{ 'status.' + status() | translate }}
    </span>
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px 2px 6px;
      border-radius: 9999px;
      font: var(--mat-sys-label-medium);
      font-weight: 600;
      white-space: nowrap;
    }
    mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .success { background: var(--brasper-success-container); color: var(--brasper-success); }
    .warning { background: var(--brasper-warning-container); color: var(--brasper-warning); }
    .info { background: var(--brasper-info-container); color: var(--brasper-info); }
    .danger { background: var(--brasper-danger-container); color: var(--brasper-danger); }
    .neutral { background: var(--brasper-neutral-container); color: var(--brasper-neutral); }
  `,
})
export class StatusChip {
  readonly status = input.required<string>();
  readonly color = computed(() => statusColor(this.status()));
  readonly icon = computed(() => statusIcon(this.status()));
}
