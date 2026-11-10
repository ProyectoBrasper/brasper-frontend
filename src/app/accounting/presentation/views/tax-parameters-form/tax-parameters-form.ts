import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { toFraction, toPercent } from '../../../../shared/domain/model/percentage';
import { maxTwoDecimals } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { AccountingStore } from '../../../application/accounting.store';
import { TaxParameters } from '../../../domain/model/tax-parameters.entity';
import { dateInUse, firstOfNextMonth, inForceOn } from '../../../domain/services/tax-parameter-figures';

/** A rate typed as a percentage: 0 to 100 with 2 decimals (the backend keeps fractions with 4). */
export const TAX_RATE_VALIDATORS = [Validators.required, Validators.min(0), Validators.max(100), maxTwoDecimals];

/** An effective date already used by a row of the history (the backend would answer 409). */
export function effectiveDateFree(history: () => readonly TaxParameters[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value instanceof Date && dateInUse(history(), control.value) ? { dateInUse: true } : null;
}

/**
 * The tax rates (`/accounting/tax-parameters`): those in force today, the form to set new ones from a date (admin
 * only, a backend rule) and the history of every change. Each change is a new row; a date in the past applies to the
 * previews and to the tax returns prepared afterwards, not to those already prepared, so the form only warns.
 */
@Component({
  selector: 'app-tax-parameters-form',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    TranslatePipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './tax-parameters-form.html',
  styleUrl: './tax-parameters-form.css',
})
export class TaxParametersForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accountingStore = inject(AccountingStore);

  readonly today = toIsoDate(new Date());
  readonly history = this.accountingStore.taxParametersHistory;
  readonly current = computed(() => inForceOn(this.history(), this.today));
  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly canSet = this.accountingStore.canSetTaxParameters;
  readonly columns = ['effectiveFrom', 'igv', 'detraction', 'retention', 'incomeTaxPrepayment', 'status'];

  readonly parametersForm = this.formBuilder.group({
    igv: this.formBuilder.control<number | null>(null, TAX_RATE_VALIDATORS),
    detraction: this.formBuilder.control<number | null>(null, TAX_RATE_VALIDATORS),
    retention: this.formBuilder.control<number | null>(null, TAX_RATE_VALIDATORS),
    incomeTaxPrepayment: this.formBuilder.control<number | null>(null, TAX_RATE_VALIDATORS),
    effectiveFrom: this.formBuilder.control<Date | null>(firstOfNextMonth(new Date()), [
      Validators.required,
      effectiveDateFree(() => this.history()),
    ]),
  });

  private readonly value = toSignal(this.parametersForm.valueChanges, { initialValue: this.parametersForm.getRawValue() });
  /** The chosen date is before today: the new rates apply backwards (only a warning). */
  readonly retroactive = computed(() => {
    const date = this.value().effectiveFrom;
    return date instanceof Date && toIsoDate(date) < this.today;
  });

  constructor() {
    super();
    // Propose the rates in force once the history arrives, until the user types any of them.
    effect(() => {
      const current = this.current();
      const form = this.parametersForm;
      if (current && form.pristine) {
        form.patchValue({
          igv: toPercent(current.igv),
          detraction: toPercent(current.detraction),
          retention: toPercent(current.retention),
          incomeTaxPrepayment: toPercent(current.incomeTaxPrepayment),
        });
      }
      // The date validator reads the history: re-check it when the history changes.
      form.controls.effectiveFrom.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.accountingStore.clearError();
    this.accountingStore.loadTaxParametersHistory();
  }

  percent(fraction: number): number {
    return toPercent(fraction);
  }

  /** Whether a row is the one in force today, one that starts later or one already replaced. */
  status(parameters: TaxParameters): string {
    if (parameters.id === this.current()?.id) {
      return 'ACTIVE';
    }
    return parameters.effectiveFrom > this.today ? 'SCHEDULED' : 'INACTIVE';
  }

  onSubmit(): void {
    if (this.parametersForm.invalid) {
      this.parametersForm.markAllAsTouched();
      return;
    }
    const value = this.parametersForm.getRawValue();
    // Saved: back to the rates in force and next month's date; on an error the typed values stay.
    this.accountingStore.setTaxParameters(
      {
        effectiveFrom: toIsoDate(value.effectiveFrom!),
        igv: toFraction(Number(value.igv)),
        detraction: toFraction(Number(value.detraction)),
        retention: toFraction(Number(value.retention)),
        incomeTaxPrepayment: toFraction(Number(value.incomeTaxPrepayment)),
      },
      () => this.onReset(),
    );
  }

  onReset(): void {
    const current = this.current();
    this.parametersForm.reset({
      igv: current ? toPercent(current.igv) : null,
      detraction: current ? toPercent(current.detraction) : null,
      retention: current ? toPercent(current.retention) : null,
      incomeTaxPrepayment: current ? toPercent(current.incomeTaxPrepayment) : null,
      effectiveFrom: firstOfNextMonth(new Date()),
    });
  }
}
