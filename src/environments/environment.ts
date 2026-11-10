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
  platformProviderInvoicesEndpointPath: '/invoices',
  platformProviderScheduledCollectionsEndpointPath: '/scheduled-collections',
  platformProviderTaxParametersEndpointPath: '/tax-parameters',
  platformProviderLedgerAccountsEndpointPath: '/ledger-accounts',
  platformProviderJournalEntriesEndpointPath: '/journal-entries',
  platformProviderTaxReturnsEndpointPath: '/tax-returns',
  platformProviderBankAccountsEndpointPath: '/bank-accounts',
  platformProviderPartnersEndpointPath: '/partners',
  platformProviderPayablesEndpointPath: '/payables',
  platformProviderLoansEndpointPath: '/loans',
  platformProviderSuppliersEndpointPath: '/suppliers',
  platformProviderExpensesEndpointPath: '/expenses',
  platformProviderEmployeesEndpointPath: '/employees',
  platformProviderFixedCostsEndpointPath: '/fixed-costs',
};
