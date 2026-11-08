import { Role } from '../domain/model/role';
import { SignInCommand } from '../domain/model/sign-in.command';
import { User } from '../domain/model/user.entity';
import { SignInRequest, SignInResource } from './sign-in.resource';

/**
 * Maps the sign-in command to its request and the authenticated user response to a session.
 */
export class SignInAssembler {
  toRequestFromCommand(command: SignInCommand): SignInRequest {
    return { username: command.username, password: command.password };
  }

  toEntityFromResource(resource: SignInResource): User {
    return new User({
      id: resource.id,
      username: resource.username,
      fullName: resource.fullName,
      role: resource.role as Role,
      active: true,
    });
  }

  toTokenFromResource(resource: SignInResource): string {
    return resource.token;
  }
}
