import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of a supplier (backend `SupplierResource`). */
export interface SupplierResource extends BaseResource {
  businessName: string;
  ruc: string | null;
  type: string;
  phone: string | null;
}

/** Envelope for a supplier collection (the API returns a plain array). */
export interface SuppliersResponse extends BaseResponse {
  suppliers: SupplierResource[];
}
