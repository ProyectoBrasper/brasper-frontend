/**
 * Development configuration: the fake API (json-server, `npm run start:api`) on port 3000.
 */
export const environment = {
  production: false,
  platformProviderApiBaseUrl: 'http://localhost:3000/api/v1',
  platformProviderSignInEndpointPath: '/auth/sign-in',
  platformProviderSignUpEndpointPath: '/auth/sign-up',
  platformProviderUsersEndpointPath: '/users',
  platformProviderClientsEndpointPath: '/clients',
  platformProviderProjectsEndpointPath: '/projects',
  platformProviderInvoicesEndpointPath: '/invoices',
  platformProviderScheduledCollectionsEndpointPath: '/scheduled-collections',
  platformProviderTaxParametersEndpointPath: '/tax-parameters',
  platformProviderBankAccountsEndpointPath: '/bank-accounts',
  platformProviderPartnersEndpointPath: '/partners',
  platformProviderSuppliersEndpointPath: '/suppliers',
  platformProviderExpensesEndpointPath: '/expenses',
};
