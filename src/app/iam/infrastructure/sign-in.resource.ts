import { BaseResource } from '../../shared/infrastructure/base-resource';

/** Body of `POST /auth/sign-in`. */
export interface SignInRequest {
  username: string;
  password: string;
}

/** Response of `POST /auth/sign-in` (backend `AuthenticatedUserResource`). */
export interface SignInResource extends BaseResource {
  username: string;
  fullName: string;
  role: string;
  token: string;
}
