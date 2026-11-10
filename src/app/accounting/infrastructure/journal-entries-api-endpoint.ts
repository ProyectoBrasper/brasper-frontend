import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { ReverseJournalEntryCommand } from '../domain/model/journal-entry.commands';
import { EntrySource, JournalEntry, JournalLine } from '../domain/model/journal-entry.entity';

/** Backend `MoneyResource`. */
export interface MoneyResource {
  amount: number;
  currency: string;
}

/** Backend `JournalLineResource`. */
export interface JournalLineResource {
  accountCode: string;
  debit: MoneyResource;
  credit: MoneyResource;
  projectId: number | null;
}

/** Backend `JournalEntryResource`. */
export interface JournalEntryResource extends BaseResource {
  entryDate: string;
  year: number;
  month: number;
  description: string;
  source: string;
  sourceId: number | null;
  reversed: boolean;
  reversalOfId: number | null;
  totalDebit: MoneyResource;
  totalCredit: MoneyResource;
  lines: JournalLineResource[];
}

/** Envelope for a journal entry collection (the API returns a plain array). */
export interface JournalEntriesResponse extends BaseResponse {
  journalEntries: JournalEntryResource[];
}

/** Body of `POST /journal-entries/{id}/reversal` (backend `ReverseJournalEntryResource`). */
export interface ReverseJournalEntryRequest {
  reversedOn: string;
}

/** Maps journal entries and their lines (`Number()` covers BigDecimal sent as a string). */
export class JournalEntryAssembler implements BaseAssembler<JournalEntry, JournalEntryResource, JournalEntriesResponse> {
  toEntitiesFromResponse(response: JournalEntriesResponse): JournalEntry[] {
    return response.journalEntries.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: JournalEntryResource): JournalEntry {
    return new JournalEntry({
      id: resource.id,
      entryDate: resource.entryDate,
      year: resource.year,
      month: resource.month,
      description: resource.description,
      source: resource.source as EntrySource,
      sourceId: resource.sourceId ?? null,
      reversed: resource.reversed,
      reversalOfId: resource.reversalOfId ?? null,
      totalDebit: Number(resource.totalDebit.amount),
      totalCredit: Number(resource.totalCredit.amount),
      currency: resource.totalDebit.currency,
      lines: resource.lines.map(
        (line) =>
          new JournalLine({
            accountCode: line.accountCode,
            debit: Number(line.debit.amount),
            credit: Number(line.credit.amount),
            currency: line.debit.currency,
            projectId: line.projectId ?? null,
          }),
      ),
    });
  }

  toResourceFromEntity(entity: JournalEntry): JournalEntryResource {
    const money = (amount: number) => ({ amount, currency: entity.currency });
    return {
      id: entity.id,
      entryDate: entity.entryDate,
      year: entity.year,
      month: entity.month,
      description: entity.description,
      source: entity.source,
      sourceId: entity.sourceId,
      reversed: entity.reversed,
      reversalOfId: entity.reversalOfId,
      totalDebit: money(entity.totalDebit),
      totalCredit: money(entity.totalCredit),
      lines: entity.lines.map((line) => ({
        accountCode: line.accountCode,
        debit: money(line.debit),
        credit: money(line.credit),
        projectId: line.projectId,
      })),
    };
  }
}

/**
 * Client for `/journal-entries` (admin, accounting and management read; admin and accounting write): the entries of
 * a month (by date, then by number) and `POST /{id}/reversal`, which answers with the new reversal entry, not with
 * the reversed one. The manual entry comes with its form.
 */
export class JournalEntriesApiEndpoint extends BaseApiEndpoint<
  JournalEntry,
  JournalEntryResource,
  JournalEntriesResponse,
  JournalEntryAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderJournalEntriesEndpointPath}`,
      new JournalEntryAssembler(),
    );
  }

  /** `GET /journal-entries?year=&month=` (both required by the backend). */
  getByPeriod(year: number, month: number): Observable<JournalEntry[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<JournalEntryResource[] | JournalEntriesResponse>(this.endpointUrl, { params }).pipe(
      map((response) =>
        Array.isArray(response)
          ? response.map((resource) => this.assembler.toEntityFromResource(resource))
          : this.assembler.toEntitiesFromResponse(response),
      ),
      catchError(this.handleError('Failed to fetch journal entries')),
    );
  }

  /** `POST /journal-entries/{id}/reversal`: answers with the reversal (a reversal or a reversed entry is a 409). */
  reverse(id: number, command: ReverseJournalEntryCommand): Observable<JournalEntry> {
    const request: ReverseJournalEntryRequest = { reversedOn: command.reversedOn };
    return this.http.post<JournalEntryResource>(`${this.endpointUrl}/${id}/reversal`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to reverse journal entry')),
    );
  }
}
