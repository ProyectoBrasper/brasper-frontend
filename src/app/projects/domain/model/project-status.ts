/**
 * Project lifecycle (backend `ProjectStatus`): quoted → in progress → completed (when the
 * accumulated progress reaches 100 %); quoted or in progress → cancelled.
 */
export enum ProjectStatus {
  QUOTED = 'QUOTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const PROJECT_STATUSES: readonly ProjectStatus[] = Object.values(ProjectStatus);
