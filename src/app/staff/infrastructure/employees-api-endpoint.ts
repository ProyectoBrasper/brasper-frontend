import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Employee } from '../domain/model/employee.entity';
import { HireEmployeeCommand, UpdateEmployeeCommand } from '../domain/model/hire-employee.command';
import { EmployeeAssembler } from './employee-assembler';
import {
  EmployeeResource,
  EmployeesResponse,
  HireEmployeeRequest,
  UpdateEmployeeRequest,
} from './employee.resource';

/**
 * Client for `/employees` (admin, accounting and management read; admin and accounting write):
 * list (`?active=` optional), get, `POST` hires, `PUT /{id}` changes position and salary, and
 * `POST /{id}/termination {terminatedOn}` terminates.
 */
export class EmployeesApiEndpoint extends BaseApiEndpoint<
  Employee,
  EmployeeResource,
  EmployeesResponse,
  EmployeeAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderEmployeesEndpointPath}`,
      new EmployeeAssembler(),
    );
  }

  hire(command: HireEmployeeCommand): Observable<Employee> {
    const request: HireEmployeeRequest = {
      fullName: command.fullName.trim(),
      dni: command.dni.trim(),
      position: command.position.trim() || null,
      monthlySalary: command.monthlySalary,
      currency: command.currency,
      hiredOn: command.hiredOn,
    };
    return this.http.post<EmployeeResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to hire employee')),
    );
  }

  updateEmployee(id: number, command: UpdateEmployeeCommand): Observable<Employee> {
    const request: UpdateEmployeeRequest = {
      position: command.position.trim() || null,
      monthlySalary: command.monthlySalary,
      currency: command.currency,
    };
    return this.http.put<EmployeeResource>(`${this.endpointUrl}/${id}`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to update employee')),
    );
  }

  /** The backend rejects a date before hiring (400) and an employee already terminated (409). */
  terminate(id: number, terminatedOn: string): Observable<Employee> {
    return this.http.post<EmployeeResource>(`${this.endpointUrl}/${id}/termination`, { terminatedOn }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to terminate employee')),
    );
  }
}
