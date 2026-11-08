import { BaseEntity } from '../domain/model/base-entity';
import { BaseResource } from './base-resource';
import { BaseResponse } from './base-response';

/**
 * Converts between domain entities and API representations. Components never see raw JSON.
 */
export interface BaseAssembler<
  TEntity extends BaseEntity,
  TResource extends BaseResource,
  TResponse extends BaseResponse,
> {
  toEntitiesFromResponse(response: TResponse): TEntity[];
  toEntityFromResource(resource: TResource): TEntity;
  toResourceFromEntity(entity: TEntity): TResource;
}
