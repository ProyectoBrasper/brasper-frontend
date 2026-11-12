import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { DisposeFixedAssetCommand, RegisterFixedAssetCommand } from '../domain/model/fixed-asset.commands';
import { FixedAsset } from '../domain/model/fixed-asset.entity';
import { JournalEntry } from '../domain/model/journal-entry.entity';
import { JournalEntryAssembler, JournalEntryResource } from './journal-entries-api-endpoint';

/** Backend `FixedAssetResource`; amounts are plain decimals, the depreciation figures as of today. */
export interface FixedAssetResource extends BaseResource {
  description: string;
  acquiredOn: string;
  taxableBase: number;
  igv: number;
  total: number;
  currency: string;
  usefulLifeMonths: number;
  expenseId: number | null;
  disposedOn: string | null;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

/** Envelope for a fixed asset collection (the API returns a plain array). */
export interface FixedAssetsResponse extends BaseResponse {
  fixedAssets: FixedAssetResource[];
}

/** Body of `POST /fixed-assets` (backend `RegisterFixedAssetResource`). */
export interface RegisterFixedAssetRequest {
  description: string;
  acquiredOn: string;
  taxableBase: number;
  currency: string;
  usefulLifeMonths: number;
  expenseId: number | null;
}

/** Maps fixed assets from their resource. */
export class FixedAssetAssembler implements BaseAssembler<FixedAsset, FixedAssetResource, FixedAssetsResponse> {
  toEntitiesFromResponse(response: FixedAssetsResponse): FixedAsset[] {
    return response.fixedAssets.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: FixedAssetResource): FixedAsset {
    return new FixedAsset({
      id: resource.id,
      description: resource.description,
      acquiredOn: resource.acquiredOn,
      taxableBase: Number(resource.taxableBase),
      igv: Number(resource.igv),
      total: Number(resource.total),
      currency: resource.currency,
      usefulLifeMonths: resource.usefulLifeMonths,
      expenseId: resource.expenseId ?? null,
      disposedOn: resource.disposedOn ?? null,
      monthlyDepreciation: Number(resource.monthlyDepreciation),
      accumulatedDepreciation: Number(resource.accumulatedDepreciation),
      bookValue: Number(resource.bookValue),
    });
  }

  toResourceFromEntity(entity: FixedAsset): FixedAssetResource {
    return {
      id: entity.id,
      description: entity.description,
      acquiredOn: entity.acquiredOn,
      taxableBase: entity.taxableBase,
      igv: entity.igv,
      total: entity.total,
      currency: entity.currency,
      usefulLifeMonths: entity.usefulLifeMonths,
      expenseId: entity.expenseId,
      disposedOn: entity.disposedOn,
      monthlyDepreciation: entity.monthlyDepreciation,
      accumulatedDepreciation: entity.accumulatedDepreciation,
      bookValue: entity.bookValue,
    };
  }
}

/**
 * Client for `/fixed-assets` (admin, accounting and management read; admin and accounting write): the list and `POST`
 * to register one, the monthly depreciation of every asset and the disposal of one.
 */
export class FixedAssetsApiEndpoint extends BaseApiEndpoint<
  FixedAsset,
  FixedAssetResource,
  FixedAssetsResponse,
  FixedAssetAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderFixedAssetsEndpointPath}`,
      new FixedAssetAssembler(),
    );
  }

  /** `POST /fixed-assets`: the backend adds the IGV and posts the acquisition entry. A currency other than PEN is a 422. */
  register(command: RegisterFixedAssetCommand): Observable<FixedAsset> {
    const request: RegisterFixedAssetRequest = {
      description: command.description.trim(),
      acquiredOn: command.acquiredOn,
      taxableBase: command.taxableBase,
      currency: command.currency,
      usefulLifeMonths: command.usefulLifeMonths,
      expenseId: command.expenseId,
    };
    return this.http.post<FixedAssetResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register fixed asset')),
    );
  }

  /** `POST /fixed-assets/depreciation`: answers with the entries; a month already posted or with nothing due is a 409. */
  runMonthlyDepreciation(year: number, month: number): Observable<JournalEntry[]> {
    const assembler = new JournalEntryAssembler();
    return this.http.post<JournalEntryResource[]>(`${this.endpointUrl}/depreciation`, { year, month }).pipe(
      map((resources) => resources.map((resource) => assembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to run depreciation')),
    );
  }

  /** `POST /fixed-assets/{id}/disposal`: already disposed is a 409, a date before the acquisition a 400. */
  dispose(id: number, command: DisposeFixedAssetCommand): Observable<FixedAsset> {
    return this.http.post<FixedAssetResource>(`${this.endpointUrl}/${id}/disposal`, { disposedOn: command.disposedOn }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to dispose fixed asset')),
    );
  }
}
