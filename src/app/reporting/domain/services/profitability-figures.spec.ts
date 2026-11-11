import { ProjectProfitability } from '../model/project-profitability';
import { costByCategory, filterProfitability } from './profitability-figures';

const project = (overrides: Partial<ConstructorParameters<typeof ProjectProfitability>[0]> = {}) =>
  new ProjectProfitability({
    projectId: 1,
    code: '001BR-ENE-2026',
    name: 'Planta',
    clientName: 'Cliente',
    status: 'IN_PROGRESS',
    currency: 'PEN',
    budget: 1000,
    estimatedCost: 500,
    actualCost: 400,
    actualCostByCategory: {},
    costDeviation: -100,
    salesCommission: 10,
    grossProfit: 590,
    margin: 0.59,
    accumulatedProgress: 0.5,
    recognizedProfitInPeriod: 59,
    invoiced: 300.3,
    collected: 100.1,
    ...overrides,
  });

describe('filterProfitability', () => {
  const inProgress = project({ projectId: 1 });
  const completed = project({ projectId: 2, status: 'COMPLETED' });
  const quoted = project({ projectId: 3, status: 'QUOTED' });
  const cancelled = project({ projectId: 4, status: 'CANCELLED' });
  const over = project({ projectId: 5, costDeviation: 6800 });
  const all = [inProgress, completed, quoted, cancelled, over];

  it('leaves out quoted and cancelled projects by default', () => {
    expect(filterProfitability(all, 'ACTIVE').map((p) => p.projectId)).toEqual([1, 2, 5]);
  });

  it('keeps only what spent more than estimated; exactly on the estimate does not count', () => {
    expect(filterProfitability([...all, project({ projectId: 6, costDeviation: 0 })], 'OVER_ESTIMATE').map((p) => p.projectId)).toEqual([5]);
  });

  it('keeps everything with all', () => {
    expect(filterProfitability(all, 'ALL')).toHaveLength(5);
  });
});

describe('ProjectProfitability', () => {
  it('tells what is invoiced and not collected, in cents', () => {
    expect(project().outstanding()).toBe(200.2);
  });
});

describe('costByCategory', () => {
  it('orders the categories from largest to smallest', () => {
    expect(costByCategory(project({ actualCostByCategory: { LABOR: 10, MATERIALS: 30, OTHER: 20 } }))).toEqual([
      { category: 'MATERIALS', amount: 30 },
      { category: 'OTHER', amount: 20 },
      { category: 'LABOR', amount: 10 },
    ]);
  });
});
