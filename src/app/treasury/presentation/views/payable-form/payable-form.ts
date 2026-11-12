import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ExpensesStore } from '../../../../expenses/application/expenses.store';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { CashFlowWeek } from '../../../../shared/domain/model/cash-flow-week';
import { Period } from '../../../../shared/domain/model/period';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { TreasuryStore } from '../../../application/treasury.store';
import { PAYABLE_TYPES, PayableType } from '../../../domain/model/payable.entity';

/** Keeps the chosen week when it exists in the new month (weeks run 1 to 6, not every month has 5 or 6). */
export function weekIn(year: number, month: number, week: number | null): number | null {
  return week !== null && CashFlowWeek.exists(new Period(year, month), week) ? week : null;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Registers a payable by hand (`/treasury/payables/new`, admin and accounting) in a cash-flow week chosen as year,
 * month and week, like the mockup: the week list comes from the month with its dates, so a week that does not
 * exist cannot be picked. A purchase with a voucher belongs in Expenses as a pending expense (it creates its own
 * payable); registering it here too would book its cost twice, so the form warns about it.
 */
@Component({
  selector: 'app-payable-form',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './payable-form.html',
  styles: `
    input.amount { text-align: right; }
    .notice {
      display: flex; align-items: flex-start; gap: 8px; margin: 0 0 20px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning); font: var(--mat-sys-body-medium);
    }
    .info {
      display: flex; align-items: center; gap: 8px; margin: 4px 0 0; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-info-container); color: var(--brasper-info); font: var(--mat-sys-body-medium);
    }
    .week-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 16px; }
    .week-grid mat-form-field { width: 100%; }
    .form-card + .form-card { margin-top: 24px; }
    .form-card-title { display: flex; align-items: center; gap: 8px; }
    .form-card-title mat-icon { color: var(--mat-sys-on-surface-variant); }
    @media (max-width: 599px) { .week-grid { grid-template-columns: 1fr; } }
  `,
})
export class PayableForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly expensesStore = inject(ExpensesStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);

  private readonly today = CashFlowWeek.from(new Date());

  readonly types = PAYABLE_TYPES;
  readonly years = [this.today.year - 1, this.today.year, this.today.year + 1];
  readonly months = MONTHS;
  readonly loading = this.treasuryStore.loading;
  readonly error = computed(() => this.treasuryStore.error() ?? this.expensesStore.error() ?? this.projectsStore.error());
  readonly suppliers = computed(() =>
    [...this.expensesStore.suppliers()].sort((a, b) => a.businessName.localeCompare(b.businessName)),
  );
  readonly projects = computed(() => [...this.projectsStore.projects()].sort((a, b) => a.code.localeCompare(b.code)));

  readonly payableForm = this.formBuilder.group({
    concept: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    type: this.formBuilder.nonNullable.control<PayableType>(PayableType.SUPPLIER, Validators.required),
    totalAmount: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    supplierId: this.formBuilder.control<number | null>(null),
    projectId: this.formBuilder.control<number | null>(null),
    year: this.formBuilder.nonNullable.control(this.today.year, Validators.required),
    month: this.formBuilder.nonNullable.control(this.today.month, Validators.required),
    week: this.formBuilder.control<number | null>(this.today.number, Validators.required),
  });

  private readonly value = toSignal(this.payableForm.valueChanges, { initialValue: this.payableForm.getRawValue() });
  /** The weeks of the chosen month, with their dates. */
  readonly weeks = computed(() => {
    const { year, month } = this.value();
    return CashFlowWeek.weeksOf(new Period(year ?? this.today.year, month ?? this.today.month));
  });

  constructor() {
    super();
    // A week chosen for another month may not exist in the new one.
    for (const control of [this.payableForm.controls.year, this.payableForm.controls.month]) {
      control.valueChanges.subscribe(() => {
        const { year, month, week } = this.payableForm.getRawValue();
        const kept = weekIn(year, month, week);
        if (kept !== week) {
          this.payableForm.controls.week.setValue(kept);
        }
      });
    }
  }

  ngOnInit(): void {
    this.treasuryStore.clearError();
    if (this.expensesStore.suppliers().length === 0) {
      this.expensesStore.loadSuppliers();
    }
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
  }

  monthLabel(month: number): string {
    return new Period(this.today.year, month).label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE').split(' ')[0];
  }

  onSubmit(): void {
    if (this.payableForm.invalid) {
      this.payableForm.markAllAsTouched();
      return;
    }
    const value = this.payableForm.getRawValue();
    this.treasuryStore.createPayable(
      {
        concept: value.concept,
        type: value.type,
        totalAmount: Math.round(Number(value.totalAmount) * 100) / 100,
        currency: 'PEN',
        supplierId: value.supplierId ?? null,
        projectId: value.projectId ?? null,
        week: new CashFlowWeek(value.year, value.month, value.week!),
      },
      ['/treasury/payables'],
    );
  }

  onCancel(): void {
    void this.router.navigate(['/treasury/payables']);
  }
}
