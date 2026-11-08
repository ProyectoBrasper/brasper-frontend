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
