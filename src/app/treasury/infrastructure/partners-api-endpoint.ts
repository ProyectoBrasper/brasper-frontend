import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { RegisterContributionCommand, RegisterPartnerCommand } from '../domain/model/partner.commands';
import { Partner, PartnerContribution } from '../domain/model/partner.entity';

/** Backend `PartnerResource.ContributionResource`. */
export interface PartnerContributionResource extends BaseResource {
  contributedOn: string;
  amount: number;
  currency: string;
  reimbursable: boolean;
  bankAccountId: number | null;
  expenseId: number | null;
  concept: string | null;
}

/** Backend `PartnerResource`: the contributions come inside the partner (there is no endpoint to list them apart). */
export interface PartnerResource extends BaseResource {
  fullName: string;
  role: string | null;
  totalContributed: number;
  contributions: PartnerContributionResource[];
}

/** Envelope for a partner collection (the API returns a plain array). */
export interface PartnersResponse extends BaseResponse {
  partners: PartnerResource[];
}

/** Body of `POST /partners` (backend `RegisterPartnerResource`). */
export interface RegisterPartnerRequest {
  fullName: string;
  role: string | null;
}

/** Body of `POST /partners/{id}/contributions` (backend `RegisterContributionResource`). */
export interface RegisterContributionRequest {
  contributedOn: string;
  amount: number;
  currency: string;
  reimbursable: boolean;
  bankAccountId: number;
  concept: string | null;
}

/** Trims a free text; empty becomes null (the backend stores null for a blank role or concept). */
const optionalText = (value: string | null | undefined): string | null => value?.trim() || null;

/** Maps partners and their contributions (`Number()` covers BigDecimal sent as a string). */
export class PartnerAssembler implements BaseAssembler<Partner, PartnerResource, PartnersResponse> {
  toEntitiesFromResponse(response: PartnersResponse): Partner[] {
    return response.partners.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: PartnerResource): Partner {
    return new Partner({
      id: resource.id,
      fullName: resource.fullName,
      role: resource.role ?? null,
      totalContributed: Number(resource.totalContributed ?? 0),
      contributions: (resource.contributions ?? []).map(
        (contribution) =>
          new PartnerContribution({
            id: contribution.id,
            contributedOn: contribution.contributedOn,
            amount: Number(contribution.amount),
            currency: contribution.currency,
            reimbursable: contribution.reimbursable,
            bankAccountId: contribution.bankAccountId ?? null,
            expenseId: contribution.expenseId ?? null,
            concept: contribution.concept ?? null,
          }),
      ),
    });
  }

  toResourceFromEntity(entity: Partner): PartnerResource {
    return {
      id: entity.id,
      fullName: entity.fullName,
      role: entity.role,
      totalContributed: entity.totalContributed,
      contributions: entity.contributions.map((contribution) => ({
        id: contribution.id,
        contributedOn: contribution.contributedOn,
        amount: contribution.amount,
        currency: contribution.currency,
        reimbursable: contribution.reimbursable,
        bankAccountId: contribution.bankAccountId,
        expenseId: contribution.expenseId,
        concept: contribution.concept,
      })),
    };
  }
}

/**
 * Client for `/partners` (admin, accounting and management read; admin and accounting write): list, `POST` a partner
 * and `POST /{id}/contributions`. Both writes answer with the whole partner.
 */
export class PartnersApiEndpoint extends BaseApiEndpoint<Partner, PartnerResource, PartnersResponse, PartnerAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderPartnersEndpointPath}`,
      new PartnerAssembler(),
    );
  }

  /** `POST /partners`: a name already in use is a 409. */
  register(command: RegisterPartnerCommand): Observable<Partner> {
    const request: RegisterPartnerRequest = { fullName: command.fullName.trim(), role: optionalText(command.role) };
    return this.http.post<PartnerResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register partner')),
    );
  }

  /** `POST /partners/{id}/contributions`: answers with the partner, its new contribution and total. */
  registerContribution(partnerId: number, command: RegisterContributionCommand): Observable<Partner> {
    const request: RegisterContributionRequest = {
      contributedOn: command.contributedOn,
      amount: command.amount,
      currency: command.currency,
      reimbursable: command.reimbursable,
      bankAccountId: command.bankAccountId,
      concept: optionalText(command.concept),
    };
    return this.http.post<PartnerResource>(`${this.endpointUrl}/${partnerId}/contributions`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register contribution')),
    );
  }
}
