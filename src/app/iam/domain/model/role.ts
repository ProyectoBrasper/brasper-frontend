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
  /** Create / edit clients, projects, suppliers and expenses (management only reads). */
  operationsWrite: [Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING, Role.ROLE_ENGINEER],
} as const satisfies Record<string, readonly Role[]>;
