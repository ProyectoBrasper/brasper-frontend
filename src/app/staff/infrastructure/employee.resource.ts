import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';

/** JSON of an employee (backend `EmployeeResource`). */
export interface EmployeeResource extends BaseResource {
  fullName: string;
  dni: string;
  position: string | null;
  monthlySalary: number;
  currency: string;
  hiredOn: string;
  terminatedOn: string | null;
  active: boolean;
}

/** Body of `POST /employees` (backend `HireEmployeeResource`). */
export interface HireEmployeeRequest {
  fullName: string;
  dni: string;
  position: string | null;
  monthlySalary: number;
  currency: string;
  hiredOn: string;
}

/** Body of `PUT /employees/{id}` (backend `UpdateEmployeeResource`). */
export interface UpdateEmployeeRequest {
  position: string | null;
  monthlySalary: number;
  currency: string;
}

/** Envelope for an employee collection (the API returns a plain array). */
export interface EmployeesResponse extends BaseResponse {
  employees: EmployeeResource[];
}
