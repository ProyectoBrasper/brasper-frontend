import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { STANDARD_TAX_RATES } from '../../../../billing/domain/services/invoice-amounts-calculator';
import { ExpensesStore } from '../../../../expenses/application/expenses.store';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { AccountingStore } from '../../../application/accounting.store';
import { linkableExpenses, previewFixedAsset } from '../../../domain/services/fixed-asset-figures';
import { inForceOn } from '../../../domain/services/tax-parameter-figures';

/** Backend rule (`@Min(1) @Max(600) int`): whole months. */
export const USEFUL_LIFE_VALIDATORS = [Validators.required, Validators.min(1), Validators.max(600), Validators.pattern(/^\d+$/)];

/**
 * Registers an asset (`/accounting/fixed-assets/new`, admin and accounting). Only the base travels: the backend adds
 * the IGV with the rate in force on the acquisition date, so the amounts here are a preview. Choosing the expense it
 * came from proposes its data and moves its cost to the asset; without one, the asset was already owned.
 */
@Component({
  selector: 'app-fixed-asset-form',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
  ],
  templateUrl: './fixed-asset-form.html',
  styleUrl: './fixed-asset-form.css',
})
export class FixedAssetForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accountingStore = inject(AccountingStore);
  private readonly expensesStore = inject(ExpensesStore);
  private readonly router = inject(Router);

  readonly assetForm = this.formBuilder.group({
    expenseId: this.formBuilder.control<number | null>(null),
    description: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(300)]),
    acquiredOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    taxableBase: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    usefulLifeMonths: this.formBuilder.control<number | null>(null, USEFUL_LIFE_VALIDATORS),
  });

  private readonly value = toSignal(this.assetForm.valueChanges, { initialValue: this.assetForm.getRawValue() });

  readonly loading = computed(() => this.accountingStore.loading() || this.expensesStore.loading());
  readonly error = computed(() => this.accountingStore.error() ?? this.expensesStore.error());
  readonly expenses = computed(() => linkableExpenses(this.expensesStore.expenses(), this.accountingStore.fixedAssets()));
  readonly fromExpense = computed(() => this.value().expenseId != null);
  /** Rates in force on the acquisition date (the backend uses the same date); undefined = standard rates. */
  readonly parameters = computed(() => {
    const date = this.value().acquiredOn;
    return date instanceof Date && !Number.isNaN(date.getTime())
      ? inForceOn(this.accountingStore.taxParametersHistory(), toIsoDate(date))
      : undefined;
  });
  readonly taxableBase = computed(() => Number(this.value().taxableBase) || 0);
  readonly preview = computed(() =>
    previewFixedAsset(
      this.taxableBase(),
      (this.parameters() ?? STANDARD_TAX_RATES).igv,
      Number(this.value().usefulLifeMonths) || 0,
    ),
  );

  constructor() {
    super();
    this.assetForm.controls.expenseId.valueChanges.subscribe((id) => this.proposeFromExpense(id));
  }

  ngOnInit(): void {
    this.accountingStore.clearError();
    this.expensesStore.clearError();
    this.accountingStore.loadFixedAssets();
    this.accountingStore.loadTaxParametersHistory();
    this.expensesStore.loadExpenses();
  }

  onSubmit(): void {
    // A description of only spaces is blank for the backend (@NotBlank).
    const description = this.assetForm.controls.description;
    if (!description.value.trim()) {
      description.setValue('');
    }
    if (this.assetForm.invalid) {
      this.assetForm.markAllAsTouched();
      return;
    }
    const value = this.assetForm.getRawValue();
    this.accountingStore.registerFixedAsset({
      description: value.description.trim(),
      acquiredOn: toIsoDate(value.acquiredOn!),
      taxableBase: Math.round(Number(value.taxableBase) * 100) / 100,
      currency: 'PEN',
      usefulLifeMonths: Number(value.usefulLifeMonths),
      expenseId: value.expenseId ?? null,
    });
  }

  onCancel(): void {
    void this.router.navigate(['/accounting/fixed-assets']);
  }

  /** The expense proposes the data of the asset, still editable: one expense may cover several assets. */
  private proposeFromExpense(id: number | null): void {
    const expense = this.expenses().find((candidate) => candidate.id === id);
    if (expense) {
      this.assetForm.patchValue({
        description: expense.description,
        acquiredOn: fromIsoDate(expense.spentOn),
        taxableBase: expense.taxableBase,
      });
    }
  }
}
