import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

/** The texts of a paginator, from the `paginator.*` i18n keys. */
interface PaginatorTexts {
  itemsPerPage: string;
  nextPage: string;
  previousPage: string;
  firstPage: string;
  lastPage: string;
  of: string;
}

/**
 * Puts the paginator texts in the current language and keeps them in step with the language switch. Material ships
 * them only in English, so every list showed "Items per page". It changes the root `MatPaginatorIntl` that every
 * paginator shares; the app loads this file lazily so the paginator does not land in the initial bundle.
 */
export function translatePaginator(intl: MatPaginatorIntl, translate: TranslateService): void {
  let of = 'of';
  intl.getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 ${of} ${length}`;
    }
    const start = page * pageSize;
    return `${start + 1} – ${Math.min(start + pageSize, length)} ${of} ${length}`;
  };
  translate.stream('paginator').subscribe((texts: PaginatorTexts | string) => {
    if (typeof texts === 'string') {
      return; // Not loaded yet: the key comes back as is.
    }
    intl.itemsPerPageLabel = texts.itemsPerPage;
    intl.nextPageLabel = texts.nextPage;
    intl.previousPageLabel = texts.previousPage;
    intl.firstPageLabel = texts.firstPage;
    intl.lastPageLabel = texts.lastPage;
    of = texts.of;
    intl.changes.next();
  });
}
