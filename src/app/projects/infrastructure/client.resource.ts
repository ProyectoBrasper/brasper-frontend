import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of a client (backend `ClientResource`). On update the backend ignores `ruc`. */
export interface ClientResource extends BaseResource {
  businessName: string;
  ruc: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

/** Envelope for a client collection (the API returns a plain array). */
export interface ClientsResponse extends BaseResponse {
  clients: ClientResource[];
}
