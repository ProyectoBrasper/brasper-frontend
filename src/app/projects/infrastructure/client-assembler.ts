import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Client } from '../domain/model/client.entity';
import { ClientResource, ClientsResponse } from './client.resource';

/**
 * Maps clients to and from their API resource. Optional fields travel as `null` when empty.
 */
export class ClientAssembler implements BaseAssembler<Client, ClientResource, ClientsResponse> {
  toEntitiesFromResponse(response: ClientsResponse): Client[] {
    return response.clients.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: ClientResource): Client {
    return new Client({
      id: resource.id,
      businessName: resource.businessName,
      ruc: resource.ruc,
      contactName: resource.contactName ?? '',
      phone: resource.phone ?? '',
      email: resource.email ?? '',
    });
  }

  toResourceFromEntity(entity: Client): ClientResource {
    return {
      id: entity.id,
      businessName: entity.businessName,
      ruc: entity.ruc,
      contactName: entity.contactName || null,
      phone: entity.phone || null,
      email: entity.email || null,
    };
  }
}
