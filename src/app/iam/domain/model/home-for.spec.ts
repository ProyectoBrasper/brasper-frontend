import { homeFor, Role } from './role';

describe('homeFor', () => {
  it('sends those who can read reports to the dashboard', () => {
    for (const role of [Role.ROLE_ADMIN, Role.ROLE_MANAGEMENT, Role.ROLE_ACCOUNTING]) {
      expect(homeFor(role)).toBe('dashboard');
    }
  });

  it('sends an engineer to the projects: the backend answers 403 to the dashboard', () => {
    expect(homeFor(Role.ROLE_ENGINEER)).toBe('projects');
  });

  it('sends a visitor without a session to the projects, whose guard asks to sign in', () => {
    expect(homeFor(null)).toBe('projects');
  });
});
