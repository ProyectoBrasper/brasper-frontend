import { statusColor, statusIcon } from './status-color';

describe('statusColor', () => {
  it('maps statuses to the DESIGN.md color families', () => {
    expect(statusColor('COLLECTED')).toBe('success');
    expect(statusColor('PENDING')).toBe('warning');
    expect(statusColor('PARTIALLY_COLLECTED')).toBe('info');
    expect(statusColor('VOIDED')).toBe('danger');
  });

  it('treats unknown statuses as neutral', () => {
    expect(statusColor('INACTIVE')).toBe('neutral');
  });

  it('pairs each color with an icon', () => {
    expect(statusIcon('PAID')).toBe('check_circle');
    expect(statusIcon('CANCELLED')).toBe('cancel');
  });
});
