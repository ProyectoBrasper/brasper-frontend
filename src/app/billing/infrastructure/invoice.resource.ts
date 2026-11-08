import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of an invoice (backend `InvoiceResource`). Amounts are calculated by the backend. */
export interface InvoiceResource extends BaseResource {
  number: string;
  issuedOn: string;
  purchaseOrder: string | null;
  projectId: number;
  clientId: number;
  currency: string;
  taxableBase: number;
  igv: number;
  total: number;
  retention: number;
  detraction: number;
  selfDetraction: boolean;
  advance: boolean;
  netAmount: number;
  collectedAmount: number;
  outstandingBalance: number;
  status: string;
  notes: string | null;
}

/** Envelope for an invoice collection (the API returns a plain array). */
export interface InvoicesResponse extends BaseResponse {
  invoices: InvoiceResource[];
}
