/**
 * Production configuration: the Spring Boot backend. Paths are the same in json-server and Spring,
 * so switching from the fake API to the real backend only changes `platformProviderApiBaseUrl`.
 */
export const environment = {
  production: true,
  platformProviderApiBaseUrl: '/api/v1',
  platformProviderSignInEndpointPath: '/auth/sign-in',
  platformProviderSignUpEndpointPath: '/auth/sign-up',
  platformProviderUsersEndpointPath: '/users',
  platformProviderClientsEndpointPath: '/clients',
  platformProviderProjectsEndpointPath: '/projects',
};
