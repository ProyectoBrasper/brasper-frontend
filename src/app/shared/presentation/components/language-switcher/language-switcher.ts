import { Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslateService } from '@ngx-translate/core';

/**
 * ES | EN toggle. Changes the UI language (numbers and dates stay in es-PE).
 */
@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonToggleModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  private readonly translate = inject(TranslateService);

  readonly languages = ['es', 'en'];

  get currentLang(): string {
    return this.translate.getCurrentLang() ?? 'es';
  }

  useLanguage(language: string): void {
    this.translate.use(language);
    document.documentElement.lang = language;
  }
}
