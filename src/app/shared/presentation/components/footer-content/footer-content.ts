import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Discreet page footer.
 */
@Component({
  selector: 'app-footer-content',
  imports: [TranslatePipe],
  template: `<footer class="footer">{{ 'footer.copyright' | translate: { year } }}</footer>`,
  styles: `
    .footer {
      padding: 24px 0 8px;
      text-align: center;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class FooterContent {
  readonly year = new Date().getFullYear();
}
