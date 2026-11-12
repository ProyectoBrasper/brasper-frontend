/** Tonal color family of a status chip (DESIGN.md §4). */
export type StatusColor = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const COLORS: Record<string, StatusColor> = {
  ACTIVE: 'success',
  ACTUAL: 'success',
  BALANCED: 'success',
  COLLECTED: 'success',
  PAID: 'success',
  POSTED: 'success',
  REALIZED: 'success',
  COMPLETED: 'success',
  PENDING: 'warning',
  PROJECTED: 'warning',
  SCHEDULED: 'warning',
  DRAFT: 'warning',
  QUOTED: 'warning',
  IN_PROGRESS: 'info',
  CURRENT: 'info',
  PARTIALLY_COLLECTED: 'info',
  PARTIALLY_PAID: 'info',
  RESCHEDULED: 'info',
  FILED: 'info',
  CANCELLED: 'danger',
  VOIDED: 'danger',
  ANNULLED: 'danger',
  UNBALANCED: 'danger',
  OVERDUE: 'danger',
};

const ICONS: Record<StatusColor, string> = {
  success: 'check_circle',
  warning: 'schedule',
  info: 'autorenew',
  danger: 'cancel',
  neutral: 'do_not_disturb_on',
};

/** Color for a backend status; unknown statuses (inactive, terminated...) are neutral. */
export function statusColor(status: string): StatusColor {
  return COLORS[status] ?? 'neutral';
}

/** Icon that accompanies the color, so the state never relies on color alone. */
export function statusIcon(status: string): string {
  return ICONS[statusColor(status)];
}
