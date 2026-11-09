/** Supplier types (backend `SupplierType`): a company needs a RUC, a natural person may not have one. */
export enum SupplierType {
  COMPANY = 'COMPANY',
  NATURAL_PERSON = 'NATURAL_PERSON',
}

export const SUPPLIER_TYPES: readonly SupplierType[] = Object.values(SupplierType);
