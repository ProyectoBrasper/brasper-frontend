import { Period } from '../../../shared/domain/model/period';
import { Partner, PartnerContribution } from '../model/partner.entity';

/** One row of the contributions table: the contribution and who made it. */
export interface ContributionRow {
  partner: Partner;
  contribution: PartnerContribution;
}

/** `yyyy-MM` of a period, to compare with the `yyyy-MM-dd` of a contribution. */
const monthOf = (period: Period) => `${period.year}-${String(period.month).padStart(2, '0')}`;

/**
 * The contributions of every partner made in a month, by date (then by id). The backend has no endpoint for this:
 * the contributions come inside each partner.
 */
export function contributionsIn(partners: readonly Partner[], period: Period): ContributionRow[] {
  const month = monthOf(period);
  return partners
    .flatMap((partner) => partner.contributions.map((contribution) => ({ partner, contribution })))
    .filter((row) => row.contribution.contributedOn.startsWith(month))
    .sort(
      (a, b) =>
        a.contribution.contributedOn.localeCompare(b.contribution.contributedOn) || a.contribution.id - b.contribution.id,
    );
}

/** Sum of the contributions of the rows, in cents. */
export function contributionsTotal(rows: readonly ContributionRow[]): number {
  return rows.reduce((sum, row) => sum + Math.round(row.contribution.amount * 100), 0) / 100;
}
