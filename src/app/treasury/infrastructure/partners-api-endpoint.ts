import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { Partner } from '../domain/model/partner.entity';

/** Backend `PartnerResource`; the contributions come with the partners screen. */
export interface PartnerResource extends BaseResource {
  fullName: string;
  role: string;
  totalContributed: number;
}

/** Envelope for a partner collection (the API returns a plain array). */
export interface PartnersResponse extends BaseResponse {
  partners: PartnerResource[];
}

/** Maps partners from their resource (they are registered with their own form, later). */
export class PartnerAssembler implements BaseAssembler<Partner, PartnerResource, PartnersResponse> {
  toEntitiesFromResponse(response: PartnersResponse): Partner[] {
    return response.partners.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: PartnerResource): Partner {
    return new Partner({ id: resource.id, fullName: resource.fullName, role: resource.role });
  }

  toResourceFromEntity(entity: Partner): PartnerResource {
    return { id: entity.id, fullName: entity.fullName, role: entity.role, totalContributed: 0 };
  }
}

/** Client for `/partners` (read by admin, accounting and management; only the list is used for now). */
export class PartnersApiEndpoint extends BaseApiEndpoint<Partner, PartnerResource, PartnersResponse, PartnerAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderPartnersEndpointPath}`,
      new PartnerAssembler(),
    );
  }
}
