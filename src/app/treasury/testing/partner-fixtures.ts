import { Partner, PartnerContribution } from '../domain/model/partner.entity';

/** A contribution; override only what a test cares about. */
export function contributionFixture(
  overrides: Partial<ConstructorParameters<typeof PartnerContribution>[0]> = {},
): PartnerContribution {
  return new PartnerContribution({
    id: 1,
    contributedOn: '2026-03-01',
    amount: 40000,
    currency: 'PEN',
    reimbursable: false,
    bankAccountId: 2,
    expenseId: null,
    concept: 'Aporte de capital',
    ...overrides,
  });
}

/** The 2 partners of DATOS.md §8 with their 4 contributions (60,000.00 and 25,000.00). */
export const datosPartners = (): Partner[] => [
  new Partner({
    id: 1,
    fullName: 'Roberto Salas Lazo',
    role: 'Socio fundador',
    totalContributed: 60000,
    contributions: [
      contributionFixture(),
      contributionFixture({ id: 2, contributedOn: '2026-07-12', amount: 17600, reimbursable: true, bankAccountId: 1 }),
      contributionFixture({
        id: 3,
        contributedOn: '2026-10-25',
        amount: 2400,
        reimbursable: true,
        bankAccountId: null,
        expenseId: 6,
        concept: 'Materiales menores para 002BR-FEB-2026',
      }),
    ],
  }),
  new Partner({
    id: 2,
    fullName: 'Mariela Cuba Núñez',
    role: 'Socia',
    totalContributed: 25000,
    contributions: [contributionFixture({ id: 4, contributedOn: '2026-03-05', amount: 25000 })],
  }),
];
