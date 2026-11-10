/**
 * User roles. Values match the backend `Role` enum and the JWT authorities.
 */
export enum Role {
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_MANAGEMENT = 'ROLE_MANAGEMENT',
  ROLE_ACCOUNTING = 'ROLE_ACCOUNTING',
  ROLE_ENGINEER = 'ROLE_ENGINEER',
}

/** All roles, in the order they are offered in selects. */
export const ROLES: readonly Role[] = Object.values(Role);

/**
 * Who can access each restricted area. Mirrors the backend permissions (`develop`):
 * accounting and reports are read by admin, accounting and management; staff (salaries)
 * is hidden from engineers; user management is admin only.
 */
export const AREA_ROLES = {
  accounting: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING, Role.ROLE_MANAGEMENT],
  reports: [Role.ROLE_ADMIN, Role.ROLE_MANAGEMENT, Role.ROLE_ACCOUNTING],
  staff: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING, Role.ROLE_MANAGEMENT],
  users: [Role.ROLE_ADMIN],
  /** Billing (invoices, payments, scheduled collections) and Treasury reads (backend #120). */
  finance: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING, Role.ROLE_MANAGEMENT],
  /** Create / edit clients, projects, suppliers and expenses (management only reads). */
  operationsWrite: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING, Role.ROLE_ENGINEER],
  /** Issue / void invoices, register collections and scheduled collections. */
  billingWrite: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING],
  /** Hire, update and terminate employees; create, pay and deactivate fixed costs (management only reads). */
  staffWrite: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING],
  /** Open accounts, move funds, pay payables and loans, register partners (management only reads). */
  treasuryWrite: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING],
  /** Add ledger accounts, register and reverse entries, prepare and pay tax returns, fixed assets (management reads). */
  accountingWrite: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING],
  /** Set new tax rates: admin only, unlike the rest of Accounting (backend rule). */
  taxParametersWrite: [Role.ROLE_ADMIN],
} as const satisfies Record<string, readonly Role[]>;
