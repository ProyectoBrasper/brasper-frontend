/** Document backing an expense (backend `VoucherType`). Only an invoice gives IGV credit. */
export enum VoucherType {
  INVOICE = 'INVOICE',
  SALES_RECEIPT = 'SALES_RECEIPT',
  FEE_RECEIPT = 'FEE_RECEIPT',
  NO_VOUCHER = 'NO_VOUCHER',
}

export const VOUCHER_TYPES: readonly VoucherType[] = Object.values(VoucherType);
