/**
 * New tax rates from a date (backend `SetTaxParametersResource`), as fractions: 0.18 = 18 %. Only an admin sets them
 * (backend rule). Each change is a new row and a date can only be used once (409), since the rows in force before may
 * already have been used.
 */
export interface SetTaxParametersCommand {
  effectiveFrom: string;
  igv: number;
  detraction: number;
  retention: number;
  incomeTaxPrepayment: number;
}
