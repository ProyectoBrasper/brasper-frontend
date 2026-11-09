import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Supplier } from '../domain/model/supplier.entity';
import { SupplierType } from '../domain/model/supplier-type';
import { SupplierResource, SuppliersResponse } from './supplier.resource';

/** Maps suppliers from their resource: a missing RUC or phone becomes an empty string. */
export class SupplierAssembler implements BaseAssembler<Supplier, SupplierResource, SuppliersResponse> {
  toEntitiesFromResponse(response: SuppliersResponse): Supplier[] {
    return response.suppliers.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: SupplierResource): Supplier {
    return new Supplier({
      id: resource.id,
      businessName: resource.businessName,
      ruc: resource.ruc ?? '',
      type: resource.type as SupplierType,
      phone: resource.phone ?? '',
    });
  }

  /** A blank RUC or phone is sent as null (the backend treats blank as absent). */
  toResourceFromEntity(entity: Supplier): SupplierResource {
    return {
      id: entity.id,
      businessName: entity.businessName,
      ruc: entity.ruc || null,
      type: entity.type,
      phone: entity.phone || null,
    };
  }
}
