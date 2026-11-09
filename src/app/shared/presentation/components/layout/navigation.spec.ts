import { Role } from '../../../../iam/domain/model/role';
import { activeLinkFor, groupOptions, NAVIGATION_OPTIONS, optionsFor } from './navigation';

const links = (role: Role | null) => optionsFor(role).map((option) => option.link);

describe('navigation', () => {
  it('has the 24 list routes of the app', () => {
    expect(NAVIGATION_OPTIONS).toHaveLength(24);
  });

  it('shows everything to an administrator', () => {
    expect(optionsFor(Role.ROLE_ADMIN)).toHaveLength(24);
  });

  it('hides finance, accounting, reports, staff and users from engineers (backend permissions)', () => {
    const engineer = links(Role.ROLE_ENGINEER);
    expect(engineer).toEqual([
      '/dashboard',
      '/projects',
      '/projects/clients',
      '/expenses',
      '/expenses/suppliers',
    ]);
    expect(engineer.some((link) => link.startsWith('/billing'))).toBe(false);
    expect(engineer.some((link) => link.startsWith('/treasury'))).toBe(false);
    expect(engineer.some((link) => link.startsWith('/accounting'))).toBe(false);
    expect(engineer.some((link) => link.startsWith('/reports'))).toBe(false);
    expect(engineer.some((link) => link.startsWith('/staff'))).toBe(false);
    expect(engineer).not.toContain('/users');
  });

  it('lets accounting and management read finance, accounting and reports but not users', () => {
    for (const role of [Role.ROLE_ACCOUNTING, Role.ROLE_MANAGEMENT]) {
      expect(links(role)).toContain('/billing/invoices');
      expect(links(role)).toContain('/treasury/bank-accounts');
      expect(links(role)).toContain('/accounting/journal-entries');
      expect(links(role)).toContain('/reports/cash-flow');
      expect(links(role)).not.toContain('/users');
    }
  });

  it('highlights the most specific option for a URL', () => {
    const options = optionsFor(Role.ROLE_ADMIN);
    expect(activeLinkFor('/projects/5/edit', options)).toBe('/projects');
    expect(activeLinkFor('/projects/clients/new', options)).toBe('/projects/clients');
    expect(activeLinkFor('/expenses?projectId=2', options)).toBe('/expenses');
    expect(activeLinkFor('/projectsx', options)).toBeNull();
  });

  it('shows nothing without a session', () => {
    expect(optionsFor(null)).toEqual([]);
  });

  it('groups the options into the five sections in order', () => {
    const sections = groupOptions(optionsFor(Role.ROLE_ADMIN));
    expect(sections.map((section) => section.group)).toEqual([
      'operation',
      'finance',
      'accounting',
      'reports',
      'administration',
    ]);
    expect(sections[0].options).toHaveLength(9);
  });
});
