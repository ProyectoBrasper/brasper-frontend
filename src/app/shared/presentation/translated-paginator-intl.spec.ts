import { TestBed } from '@angular/core/testing';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { translatePaginator } from './translated-paginator-intl';

describe('translatePaginator', () => {
  const texts = (itemsPerPage: string, of: string) => ({
    paginator: { itemsPerPage, nextPage: 'Siguiente', previousPage: 'Anterior', firstPage: 'Primera', lastPage: 'Última', of },
  });

  let translate: TranslateService;
  let intl: MatPaginatorIntl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', texts('Por página:', 'de'));
    translate.setTranslation('en', texts('Items per page:', 'of'));
    translate.use('es');
    intl = TestBed.inject(MatPaginatorIntl);
    translatePaginator(intl, translate);
  });

  it('uses the texts of the current language', () => {
    expect(intl.itemsPerPageLabel).toBe('Por página:');
    expect(intl.getRangeLabel(1, 10, 24)).toBe('11 – 20 de 24');
  });

  it('shows the last page up to the length and an empty list as 0', () => {
    expect(intl.getRangeLabel(2, 10, 24)).toBe('21 – 24 de 24');
    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 de 0');
  });

  it('follows a language change and tells the paginators to refresh', () => {
    const changed = vi.fn();
    intl.changes.subscribe(changed);
    translate.use('en');
    expect(intl.itemsPerPageLabel).toBe('Items per page:');
    expect(intl.getRangeLabel(0, 10, 3)).toBe('1 – 3 of 3');
    expect(changed).toHaveBeenCalled();
  });
});
