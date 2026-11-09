import { Component, computed, effect, inject, input, OnInit, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StaffStore } from '../../../application/staff.store';

/** Backend rule (`Dni`): exactly 8 digits. */
export const DNI_PATTERN = /^\d{8}$/;

/**
 * Hire (`/staff/employees/new`) or edit (`/staff/employees/:id/edit`) an employee. Once hired only the
 * position and the salary change; name, DNI and hiring date stay locked. A terminated employee cannot be
 * edited (the backend answers 409), so the form says so and does not submit.
 */
@Component({
  selector: 'app-employee-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './employee-form.html',
  styles: `
    input.amount { text-align: right; }
    .page-notice {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning);
    }
  `,
})
export class EmployeeForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly staffStore = inject(StaffStore);
  private readonly router = inject(Router);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input<string>();

  readonly employeeId = computed(() => (this.id() ? Number(this.id()) : null));
  readonly isEdit = computed(() => this.employeeId() !== null);
  readonly employee = computed(() => this.staffStore.getEmployeeById(this.employeeId()));
  readonly terminated = computed(() => this.employee()?.active === false);
  readonly loading = this.staffStore.loading;
  readonly error = this.staffStore.error;

  readonly employeeForm = this.formBuilder.group({
    fullName: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    dni: this.formBuilder.nonNullable.control('', [Validators.required, Validators.pattern(DNI_PATTERN)]),
    position: this.formBuilder.nonNullable.control('', Validators.maxLength(100)),
    monthlySalary: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    hiredOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
  });

  constructor() {
    super();
    // Fill the form once the employee being edited is available.
    effect(() => {
      const employee = this.employee();
      if (employee && this.isEdit() && this.employeeForm.pristine) {
        untracked(() =>
          this.employeeForm.patchValue({
            fullName: employee.fullName,
            dni: employee.dni,
            position: employee.position,
            monthlySalary: employee.monthlySalary,
            hiredOn: fromIsoDate(employee.hiredOn),
          }),
        );
      }
    });
  }

  ngOnInit(): void {
    this.staffStore.clearError();
    if (this.isEdit()) {
      const { fullName, dni, hiredOn } = this.employeeForm.controls;
      for (const control of [fullName, dni, hiredOn]) {
        control.disable();
      }
      this.staffStore.loadEmployee(this.employeeId()!);
    }
  }

  onSubmit(): void {
    if (this.terminated()) {
      return;
    }
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }
    const value = this.employeeForm.getRawValue();
    const monthlySalary = Math.round(Number(value.monthlySalary) * 100) / 100;
    if (this.isEdit()) {
      this.staffStore.updateEmployee(
        this.employeeId()!,
        { position: value.position, monthlySalary, currency: 'PEN' },
        ['/staff/employees'],
      );
      return;
    }
    this.staffStore.hireEmployee(
      {
        fullName: value.fullName,
        dni: value.dni,
        position: value.position,
        monthlySalary,
        currency: 'PEN',
        hiredOn: toIsoDate(value.hiredOn!),
      },
      ['/staff/employees'],
    );
  }

  onCancel(): void {
    void this.router.navigate(['/staff/employees']);
  }
}
