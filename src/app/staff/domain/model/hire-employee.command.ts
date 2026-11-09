/** Data to hire an employee (backend `HireEmployeeResource`). The DNI has exactly 8 digits. */
export interface HireEmployeeCommand {
  fullName: string;
  dni: string;
  position: string;
  monthlySalary: number;
  currency: string;
  hiredOn: string;
}

/** What can change after hiring (backend `UpdateEmployeeResource`): position and salary. */
export interface UpdateEmployeeCommand {
  position: string;
  monthlySalary: number;
  currency: string;
}
