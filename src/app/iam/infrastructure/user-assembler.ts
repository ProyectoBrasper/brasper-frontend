import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Role } from '../domain/model/role';
import { User } from '../domain/model/user.entity';
import { UserResource, UsersResponse } from './user.resource';

/**
 * Maps users to and from their API resource.
 */
export class UserAssembler implements BaseAssembler<User, UserResource, UsersResponse> {
  toEntitiesFromResponse(response: UsersResponse): User[] {
    return response.users.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: UserResource): User {
    return new User({
      id: resource.id,
      username: resource.username,
      fullName: resource.fullName,
      role: resource.role as Role,
      active: resource.active,
    });
  }

  toResourceFromEntity(entity: User): UserResource {
    return {
      id: entity.id,
      username: entity.username,
      fullName: entity.fullName,
      role: entity.role,
      active: entity.active,
    };
  }
}
