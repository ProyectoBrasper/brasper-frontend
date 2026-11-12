import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of a user (`GET /users`, `POST /auth/sign-up`, role change, deactivation). */
export interface UserResource extends BaseResource {
  username: string;
  fullName: string;
  role: string;
  active: boolean;
}

/** Envelope for a user collection (the API returns a plain array). */
export interface UsersResponse extends BaseResponse {
  users: UserResource[];
}
