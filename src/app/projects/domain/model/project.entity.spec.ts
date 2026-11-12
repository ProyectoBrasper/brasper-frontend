import { PROJECT_CODE_PATTERN, Project } from './project.entity';
import { ProjectStatus } from './project-status';

const project = (status: ProjectStatus, accumulatedProgress = 0) =>
  new Project({
    id: 1,
    code: '001BR-ENE-2026',
    name: 'Ampliación planta de empaque',
    description: '',
    clientId: 1,
    budget: 850000,
    currency: 'PEN',
    quotedOn: '2026-01-14',
    status,
    participation: 0.6,
    salesCommissionRate: 0.02,
    accumulatedProgress,
    estimatedDirectCost: 480000,
  });

describe('Project', () => {
  it('follows the backend status rules', () => {
    expect(project(ProjectStatus.QUOTED).canStart()).toBe(true);
    expect(project(ProjectStatus.IN_PROGRESS).canStart()).toBe(false);
    expect(project(ProjectStatus.QUOTED).isOpen()).toBe(true);
    expect(project(ProjectStatus.IN_PROGRESS).isOpen()).toBe(true);
    expect(project(ProjectStatus.COMPLETED).isOpen()).toBe(false);
    expect(project(ProjectStatus.CANCELLED).isOpen()).toBe(false);
  });

  it('computes the remaining progress without float noise', () => {
    expect(project(ProjectStatus.IN_PROGRESS, 0.72).remainingProgress()).toBe(0.28);
    expect(project(ProjectStatus.COMPLETED, 1).remainingProgress()).toBe(0);
  });

  it('accepts only codes like 001BR-ENE-2026', () => {
    expect(PROJECT_CODE_PATTERN.test('001BR-ENE-2026')).toBe(true);
    expect(PROJECT_CODE_PATTERN.test('6BR-NOV-2026')).toBe(false);
    expect(PROJECT_CODE_PATTERN.test('006BR-NOVI-2026')).toBe(false);
    expect(PROJECT_CODE_PATTERN.test('006BR-JAN-2026')).toBe(false);
  });
});
