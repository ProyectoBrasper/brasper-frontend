import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Employee } from '../domain/model/employee.entity';
import {
  CreateFixedCostCommand,
  RegisterFixedCostPaymentCommand,
  UpdateFixedCostCommand,
} from '../domain/model/fixed-cost.commands';
import { FixedCost } from '../domain/model/fixed-cost.entity';
import { FixedCostPayment } from '../domain/model/fixed-cost-payment.entity';
import { HireEmployeeCommand, UpdateEmployeeCommand } from '../domain/model/hire-employee.command';
import { EmployeesApiEndpoint } from './employees-api-endpoint';
import { FixedCostPaymentsApiEndpoint } from './fixed-cost-payments-api-endpoint';
import { FixedCostsApiEndpoint } from './fixed-costs-api-endpoint';

/** Staff context facade: employees, fixed costs and their monthly payments. */
@Injectable({ providedIn: 'root' })
export class StaffApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly employeesEndpoint = new EmployeesApiEndpoint(this.http);
  private readonly fixedCostsEndpoint = new FixedCostsApiEndpoint(this.http);
  private readonly fixedCostPaymentsEndpoint = new FixedCostPaymentsApiEndpoint(this.http);

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

  getFixedCosts(): Observable<FixedCost[]> {
    return this.fixedCostsEndpoint.getAll();
  }

  getFixedCostById(id: number): Observable<FixedCost> {
    return this.fixedCostsEndpoint.getById(id);
  }

  createFixedCost(command: CreateFixedCostCommand): Observable<FixedCost> {
    return this.fixedCostsEndpoint.createFixedCost(command);
  }

  updateFixedCost(id: number, command: UpdateFixedCostCommand): Observable<FixedCost> {
    return this.fixedCostsEndpoint.updateFixedCost(id, command);
  }

  deactivateFixedCost(id: number): Observable<FixedCost> {
    return this.fixedCostsEndpoint.deactivate(id);
  }

  getPaymentsByPeriod(year: number, month: number): Observable<FixedCostPayment[]> {
    return this.fixedCostPaymentsEndpoint.getByPeriod(year, month);
  }

  registerPayment(fixedCostId: number, command: RegisterFixedCostPaymentCommand): Observable<FixedCostPayment> {
    return this.fixedCostPaymentsEndpoint.register(fixedCostId, command);
  }
}
