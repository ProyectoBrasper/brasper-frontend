import { AREA_ROLES, Role } from '../../../../iam/domain/model/role';

/** Visual section of the side menu (label only; the option list itself is flat). */
export type NavigationGroup = 'operation' | 'finance' | 'accounting' | 'reports' | 'administration';

/** One side-menu option. `roles` empty = any signed-in user. */
export interface NavigationOption {
  link: string;
  label: string;
  icon: string;
  roles: readonly Role[];
  group: NavigationGroup;
}

/** All menu options, in display order. Labels are i18n keys. */
export const NAVIGATION_OPTIONS: readonly NavigationOption[] = [
  { link: '/dashboard', label: 'nav.dashboard', icon: 'space_dashboard', roles: AREA_ROLES.reports, group: 'operation' },
  { link: '/projects', label: 'nav.projects', icon: 'work', roles: [], group: 'operation' },
  { link: '/projects/clients', label: 'nav.clients', icon: 'group', roles: [], group: 'operation' },
  { link: '/billing/invoices', label: 'nav.invoices', icon: 'receipt_long', roles: AREA_ROLES.finance, group: 'operation' },
  { link: '/billing/scheduled-collections', label: 'nav.scheduledCollections', icon: 'event_repeat', roles: AREA_ROLES.finance, group: 'operation' },
  { link: '/expenses', label: 'nav.expenses', icon: 'payments', roles: [], group: 'operation' },
  { link: '/expenses/suppliers', label: 'nav.suppliers', icon: 'local_shipping', roles: [], group: 'operation' },
  { link: '/staff/employees', label: 'nav.employees', icon: 'badge', roles: AREA_ROLES.staff, group: 'operation' },
  { link: '/staff/fixed-costs', label: 'nav.fixedCosts', icon: 'price_check', roles: AREA_ROLES.staff, group: 'operation' },
  { link: '/treasury/bank-accounts', label: 'nav.bankAccounts', icon: 'account_balance', roles: AREA_ROLES.finance, group: 'finance' },
  { link: '/treasury/payables', label: 'nav.payables', icon: 'pending_actions', roles: AREA_ROLES.finance, group: 'finance' },
  { link: '/treasury/loans', label: 'nav.loans', icon: 'credit_score', roles: AREA_ROLES.finance, group: 'finance' },
  { link: '/treasury/partners', label: 'nav.partners', icon: 'handshake', roles: AREA_ROLES.finance, group: 'finance' },
  { link: '/accounting/ledger-accounts', label: 'nav.ledgerAccounts', icon: 'menu_book', roles: AREA_ROLES.accounting, group: 'accounting' },
  { link: '/accounting/journal-entries', label: 'nav.journalEntries', icon: 'format_list_bulleted', roles: AREA_ROLES.accounting, group: 'accounting' },
  { link: '/accounting/trial-balance', label: 'nav.trialBalance', icon: 'balance', roles: AREA_ROLES.accounting, group: 'accounting' },
  { link: '/accounting/tax-returns', label: 'nav.taxReturns', icon: 'description', roles: AREA_ROLES.accounting, group: 'accounting' },
  { link: '/accounting/tax-parameters', label: 'nav.taxParameters', icon: 'tune', roles: AREA_ROLES.accounting, group: 'accounting' },
  { link: '/accounting/fixed-assets', label: 'nav.fixedAssets', icon: 'inventory_2', roles: AREA_ROLES.accounting, group: 'accounting' },
  { link: '/reports/cash-flow', label: 'nav.cashFlow', icon: 'monitoring', roles: AREA_ROLES.reports, group: 'reports' },
  { link: '/reports/income-statement', label: 'nav.incomeStatement', icon: 'request_quote', roles: AREA_ROLES.reports, group: 'reports' },
  { link: '/reports/balance-sheet', label: 'nav.balanceSheet', icon: 'account_balance_wallet', roles: AREA_ROLES.reports, group: 'reports' },
  { link: '/reports/project-profitability', label: 'nav.projectProfitability', icon: 'insights', roles: AREA_ROLES.reports, group: 'reports' },
  { link: '/users', label: 'nav.users', icon: 'manage_accounts', roles: AREA_ROLES.users, group: 'administration' },
];

/** Options the given role can see. */
export function optionsFor(role: Role | null): NavigationOption[] {
  if (!role) {
    return [];
  }
  return NAVIGATION_OPTIONS.filter((option) => option.roles.length === 0 || option.roles.includes(role));
}

/**
 * The option to highlight for a URL: the longest link that prefixes it, so `/projects/5/edit`
 * marks Projects and `/projects/clients/new` marks Clients.
 */
export function activeLinkFor(url: string, options: readonly NavigationOption[]): string | null {
  const path = url.split(/[?#]/)[0];
  const matches = options
    .map((option) => option.link)
    .filter((link) => path === link || path.startsWith(`${link}/`));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

/** Groups consecutive options by section, keeping their order. */
export function groupOptions(
  options: readonly NavigationOption[],
): { group: NavigationGroup; options: NavigationOption[] }[] {
  const sections: { group: NavigationGroup; options: NavigationOption[] }[] = [];
  for (const option of options) {
    const last = sections.at(-1);
    if (last?.group === option.group) {
      last.options.push(option);
    } else {
      sections.push({ group: option.group, options: [option] });
    }
  }
  return sections;
}
