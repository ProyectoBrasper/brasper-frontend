/** Body of `POST /auth/sign-up`. The response is a {@link UserResource}. */
export interface SignUpRequest {
  username: string;
  password: string;
  fullName: string;
  role: string;
}
