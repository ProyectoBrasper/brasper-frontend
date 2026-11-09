import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Supplier } from '../domain/model/supplier.entity';
import { SupplierAssembler } from './supplier-assembler';
import { SupplierResource, SuppliersResponse } from './supplier.resource';

/** Client for `/suppliers` (read by any signed-in user; create and edit come with the supplier screens). */
export class SuppliersApiEndpoint extends BaseApiEndpoint<
  Supplier,
  SupplierResource,
  SuppliersResponse,
  SupplierAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderSuppliersEndpointPath}`,
      new SupplierAssembler(),
    );
  }
}
