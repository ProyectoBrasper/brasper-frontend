import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Employee } from '../domain/model/employee.entity';
import { HireEmployeeCommand, UpdateEmployeeCommand } from '../domain/model/hire-employee.command';
import { EmployeesApiEndpoint } from './employees-api-endpoint';

/** Staff context facade (employees for now; fixed costs and their payments follow). */
@Injectable({ providedIn: 'root' })
export class StaffApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly employeesEndpoint = new EmployeesApiEndpoint(this.http);

  getEmployees(): Observable<Employee[]> {
    return this.employeesEndpoint.getAll();
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.employeesEndpoint.getById(id);
  }

  hireEmployee(command: HireEmployeeCommand): Observable<Employee> {
    return this.employeesEndpoint.hire(command);
  }

  updateEmployee(id: number, command: UpdateEmployeeCommand): Observable<Employee> {
    return this.employeesEndpoint.updateEmployee(id, command);
  }

  terminateEmployee(id: number, terminatedOn: string): Observable<Employee> {
    return this.employeesEndpoint.terminate(id, terminatedOn);
  }
}
