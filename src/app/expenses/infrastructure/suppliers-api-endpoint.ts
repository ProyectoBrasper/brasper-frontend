import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Supplier } from '../domain/model/supplier.entity';
import { SupplierAssembler } from './supplier-assembler';
import { SupplierResource, SuppliersResponse } from './supplier.resource';

/**
 * Client for `/suppliers` (list, get, create, update). Any signed-in user reads; writing is admin,
 * accounting and engineers. Updating only sends the name and the phone: the RUC and the type are
 * fixed once the supplier exists (backend `UpdateSupplierResource`).
 */
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

  override update(supplier: Supplier, id: number): Observable<Supplier> {
    const body = { businessName: supplier.businessName, phone: supplier.phone || null };
    return this.http.put<SupplierResource>(`${this.endpointUrl}/${id}`, body).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to update supplier')),
    );
  }
}
