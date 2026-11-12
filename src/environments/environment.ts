/**
 * Production configuration: the Spring Boot backend published on Render. The frontend is served from another domain
 * (Vercel), so the backend must allow it in its CORS settings. Paths are the same in json-server and Spring, so
 * switching from the fake API to the real backend only changes `platformProviderApiBaseUrl`.
 */
export const environment = {
  production: true,
  platformProviderApiBaseUrl: 'https://brasper-backend.onrender.com/api/v1',
  platformProviderSignInEndpointPath: '/auth/sign-in',
  platformProviderSignUpEndpointPath: '/auth/sign-up',
  platformProviderPasswordEndpointPath: '/auth/password',
  platformProviderUsersEndpointPath: '/users',
  platformProviderClientsEndpointPath: '/clients',
  platformProviderProjectsEndpointPath: '/projects',
  platformProviderInvoicesEndpointPath: '/invoices',
  platformProviderScheduledCollectionsEndpointPath: '/scheduled-collections',
  platformProviderTaxParametersEndpointPath: '/tax-parameters',
  platformProviderLedgerAccountsEndpointPath: '/ledger-accounts',
  platformProviderJournalEntriesEndpointPath: '/journal-entries',
  platformProviderTaxReturnsEndpointPath: '/tax-returns',
  platformProviderFixedAssetsEndpointPath: '/fixed-assets',
  platformProviderReportsEndpointPath: '/reports',
  platformProviderBankAccountsEndpointPath: '/bank-accounts',
  platformProviderPartnersEndpointPath: '/partners',
  platformProviderPayablesEndpointPath: '/payables',
  platformProviderLoansEndpointPath: '/loans',
  platformProviderSuppliersEndpointPath: '/suppliers',
  platformProviderExpensesEndpointPath: '/expenses',
  platformProviderEmployeesEndpointPath: '/employees',
  platformProviderFixedCostsEndpointPath: '/fixed-costs',
};
