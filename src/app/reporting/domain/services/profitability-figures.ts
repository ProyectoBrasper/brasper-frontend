import { ProjectProfitability } from '../model/project-profitability';

export type ProfitabilityFilter = 'ACTIVE' | 'OVER_ESTIMATE' | 'ALL';

export const PROFITABILITY_FILTERS: readonly ProfitabilityFilter[] = ['ACTIVE', 'OVER_ESTIMATE', 'ALL'];

/** The projects a filter keeps. */
export function filterProfitability(
  projects: readonly ProjectProfitability[],
  filter: ProfitabilityFilter,
): ProjectProfitability[] {
  switch (filter) {
    case 'ACTIVE':
      return projects.filter((project) => project.isActive());
    case 'OVER_ESTIMATE':
      return projects.filter((project) => project.isOverEstimate());
    default:
      return [...projects];
  }
}

/** The actual cost by category, largest first. */
export function costByCategory(project: ProjectProfitability): { category: string; amount: number }[] {
  return Object.entries(project.actualCostByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
