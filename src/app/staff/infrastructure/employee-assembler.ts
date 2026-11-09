import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Employee } from '../domain/model/employee.entity';
import { EmployeeResource, EmployeesResponse } from './employee.resource';

/**
 * Maps employees from their resource. A missing position becomes an empty string; `Number()` covers
 * BigDecimal sent as a string. Employees are never sent whole: hiring and updating use their own requests.
 */
export class EmployeeAssembler implements BaseAssembler<Employee, EmployeeResource, EmployeesResponse> {
  toEntitiesFromResponse(response: EmployeesResponse): Employee[] {
    return response.employees.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: EmployeeResource): Employee {
    return new Employee({
      id: resource.id,
      fullName: resource.fullName,
      dni: resource.dni,
      position: resource.position ?? '',
      monthlySalary: Number(resource.monthlySalary),
      currency: resource.currency,
      hiredOn: resource.hiredOn,
      terminatedOn: resource.terminatedOn ?? null,
      active: resource.active,
    });
  }

  toResourceFromEntity(entity: Employee): EmployeeResource {
    return {
      id: entity.id,
      fullName: entity.fullName,
      dni: entity.dni,
      position: entity.position || null,
      monthlySalary: entity.monthlySalary,
      currency: entity.currency,
      hiredOn: entity.hiredOn,
      terminatedOn: entity.terminatedOn,
      active: entity.active,
    };
  }
}
