import { Employee } from '../domain/model/employee.entity';

/** An active employee; override only what a test cares about. */
export function employeeFixture(overrides: Partial<ConstructorParameters<typeof Employee>[0]> = {}): Employee {
  return new Employee({
    id: 1,
    fullName: 'Carla Mendoza Rojas',
    dni: '41234561',
    position: 'Gerente administrativa',
    monthlySalary: 8500,
    currency: 'PEN',
    hiredOn: '2024-01-02',
    terminatedOn: null,
    active: true,
    ...overrides,
  });
}
