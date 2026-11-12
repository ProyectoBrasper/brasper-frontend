import { Component, computed, effect, inject, input, OnInit, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StaffStore } from '../../../application/staff.store';
import { CASH_FLOW_WEEKS, FIXED_COST_TYPES, FixedCostType } from '../../../domain/model/fixed-cost-type';
import { nextCostCode, salaryConcept } from '../../../domain/services/fixed-cost-figures';

/**
 * Create (`/staff/fixed-costs/new`) or edit (`/staff/fixed-costs/:id/edit`) a fixed cost. A salary needs
 * its employee; choosing one proposes the concept and the amount while the user has not typed them.
 * Once created only the concept, the amount and the weeks change. An inactive cost cannot be edited.
 */
@Component({
  selector: 'app-fixed-cost-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './fixed-cost-form.html',
  styles: `
    input.amount { text-align: right; }
    .weeks { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .weeks-label { font: var(--mat-sys-body-medium); font-weight: 600; }
    .weeks-hint { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }
    mat-button-toggle-group { align-self: flex-start; }
    .page-notice {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning);
    }
  `,
})
export class FixedCostForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly staffStore = inject(StaffStore);
  private readonly router = inject(Router);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input<string>();

  readonly fixedCostId = computed(() => (this.id() ? Number(this.id()) : null));
  readonly isEdit = computed(() => this.fixedCostId() !== null);
  readonly fixedCost = computed(() => this.staffStore.getFixedCostById(this.fixedCostId()));
  readonly inactive = computed(() => this.fixedCost()?.active === false);
  readonly loading = this.staffStore.loading;
  readonly error = this.staffStore.error;
  readonly types = FIXED_COST_TYPES;
  readonly weeks = CASH_FLOW_WEEKS;
  /** Active employees, plus the one already linked when editing (it may have been terminated since). */
  readonly employees = computed(() => {
    const current = this.fixedCost()?.employeeId ?? null;
    return this.staffStore.employees().filter((e) => e.isActive() || e.id === current);
  });

  readonly fixedCostForm = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(30)]),
    type: this.formBuilder.nonNullable.control<FixedCostType>(FixedCostType.SALARY, Validators.required),
    concept: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    employeeId: this.formBuilder.control<number | null>(null, Validators.required),
    monthlyAmount: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    expectedWeeks: this.formBuilder.nonNullable.control<number[]>([]),
  });

  constructor() {
    super();
    // A salary needs its employee (backend rule); other types may name one or not.
    this.fixedCostForm.controls.type.valueChanges.subscribe((type) => this.applyType(type));
    // Choosing the employee of a salary proposes the concept and the amount until the user types them.
    this.fixedCostForm.controls.employeeId.valueChanges.subscribe((employeeId) => this.proposeFromEmployee(employeeId));
    // Propose the next CF code once the existing ones are known.
    effect(() => {
      const codes = this.staffStore.fixedCosts().map((cost) => cost.code);
      const code = this.fixedCostForm.controls.code;
      if (!this.isEdit() && code.pristine) {
        untracked(() => code.setValue(nextCostCode(codes)));
      }
    });
    // Fill the form once the cost being edited is available.
    effect(() => {
      const cost = this.fixedCost();
      if (cost && this.isEdit() && this.fixedCostForm.pristine) {
        untracked(() =>
          this.fixedCostForm.patchValue(
            {
              code: cost.code,
              type: cost.type,
              concept: cost.concept,
              employeeId: cost.employeeId,
              monthlyAmount: cost.monthlyAmount,
              expectedWeeks: cost.expectedWeeks,
            },
            { emitEvent: false },
          ),
        );
      }
    });
  }

  ngOnInit(): void {
    this.staffStore.clearError();
    if (this.staffStore.employees().length === 0) {
      this.staffStore.loadEmployees();
    }
    if (this.isEdit()) {
      const { code, type, employeeId } = this.fixedCostForm.controls;
      for (const control of [code, type, employeeId]) {
        control.disable({ emitEvent: false });
      }
      this.staffStore.loadFixedCost(this.fixedCostId()!);
    } else if (this.staffStore.fixedCosts().length === 0) {
      this.staffStore.loadFixedCosts();
    }
  }

  onSubmit(): void {
    if (this.inactive()) {
      return;
    }
    if (this.fixedCostForm.invalid) {
      this.fixedCostForm.markAllAsTouched();
      return;
    }
    const value = this.fixedCostForm.getRawValue();
    const monthlyAmount = Math.round(Number(value.monthlyAmount) * 100) / 100;
    if (this.isEdit()) {
      this.staffStore.updateFixedCost(
        this.fixedCostId()!,
        { concept: value.concept, monthlyAmount, expectedWeeks: value.expectedWeeks },
        ['/staff/fixed-costs'],
      );
      return;
    }
    this.staffStore.createFixedCost(
      {
        code: value.code,
        concept: value.concept,
        type: value.type,
        monthlyAmount,
        currency: 'PEN',
        employeeId: value.employeeId ?? null,
        expectedWeeks: value.expectedWeeks,
      },
      ['/staff/fixed-costs'],
    );
  }

  onCancel(): void {
    void this.router.navigate(['/staff/fixed-costs']);
  }

  private applyType(type: FixedCostType): void {
    const employee = this.fixedCostForm.controls.employeeId;
    employee.setValidators(type === FixedCostType.SALARY ? Validators.required : null);
    employee.updateValueAndValidity({ emitEvent: false });
  }

  private proposeFromEmployee(employeeId: number | null): void {
    const employee = this.staffStore.getEmployeeById(employeeId);
    if (this.isEdit() || !employee || this.fixedCostForm.controls.type.value !== FixedCostType.SALARY) {
      return;
    }
    const { concept, monthlyAmount } = this.fixedCostForm.controls;
    if (concept.pristine) {
      concept.setValue(salaryConcept(employee.fullName, this.translate.instant('fixedCostType.SALARY')));
    }
    if (monthlyAmount.pristine) {
      monthlyAmount.setValue(employee.monthlySalary);
    }
  }
}
