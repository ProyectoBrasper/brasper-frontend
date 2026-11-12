import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { CreateLedgerAccountCommand } from '../domain/model/ledger-account.commands';
import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';

/** Backend `LedgerAccountResource`. */
export interface LedgerAccountResource extends BaseResource {
  code: string;
  name: string;
  type: string;
  active: boolean;
}

/** Envelope for a ledger account collection (the API returns a plain array). */
export interface LedgerAccountsResponse extends BaseResponse {
  ledgerAccounts: LedgerAccountResource[];
}

/** Body of `POST /ledger-accounts` (backend `CreateLedgerAccountResource`). */
export interface CreateLedgerAccountRequest {
  code: string;
  name: string;
  type: string;
}

/** Maps ledger accounts from their resource. */
export class LedgerAccountAssembler implements BaseAssembler<LedgerAccount, LedgerAccountResource, LedgerAccountsResponse> {
  toEntitiesFromResponse(response: LedgerAccountsResponse): LedgerAccount[] {
    return response.ledgerAccounts.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: LedgerAccountResource): LedgerAccount {
    return new LedgerAccount({
      id: resource.id,
      code: resource.code,
      name: resource.name,
      type: resource.type as LedgerAccountType,
      active: resource.active,
    });
  }

  toResourceFromEntity(entity: LedgerAccount): LedgerAccountResource {
    return { id: entity.id, code: entity.code, name: entity.name, type: entity.type, active: entity.active };
  }
}

/**
 * Client for `/ledger-accounts` (admin, accounting and management read; admin and accounting write): the chart of
 * accounts ordered by code and `POST` to add one. The trial balance hangs from it too, with its screen.
 */
export class LedgerAccountsApiEndpoint extends BaseApiEndpoint<
  LedgerAccount,
  LedgerAccountResource,
  LedgerAccountsResponse,
  LedgerAccountAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderLedgerAccountsEndpointPath}`,
      new LedgerAccountAssembler(),
    );
  }

  /** `POST /ledger-accounts`: a code already in use is a 409. It starts active. */
  createAccount(command: CreateLedgerAccountCommand): Observable<LedgerAccount> {
    const request: CreateLedgerAccountRequest = { code: command.code.trim(), name: command.name.trim(), type: command.type };
    return this.http.post<LedgerAccountResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to create ledger account')),
    );
  }
}
