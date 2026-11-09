import { Component, computed, effect, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { ExpensesStore } from '../../../application/expenses.store';
import { Supplier } from '../../../domain/model/supplier.entity';
import { SUPPLIER_TYPES, SupplierType } from '../../../domain/model/supplier-type';

/** Backend rule (`Ruc`): exactly 11 digits. */
const RUC_PATTERN = /^\d{11}$/;

/** A company needs a RUC; a natural person may leave it empty but, if given, it must be valid. */
export const rucValidators = (type: SupplierType): ValidatorFn[] =>
  type === SupplierType.COMPANY ? [Validators.required, Validators.pattern(RUC_PATTERN)] : [Validators.pattern(RUC_PATTERN)];

/**
 * Create (`/expenses/suppliers/new`) or edit (`/expenses/suppliers/:id/edit`) a supplier. Once created, only
 * the business name and the phone can change: the type and the RUC stay locked (backend rule).
 */
@Component({
  selector: 'app-supplier-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './supplier-form.html',
})
export class SupplierForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly expensesStore = inject(ExpensesStore);
  private readonly router = inject(Router);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input<string>();

  readonly supplierId = computed(() => (this.id() ? Number(this.id()) : null));
  readonly isEdit = computed(() => this.supplierId() !== null);
  readonly supplier = computed(() => {
    const id = this.supplierId();
    return id === null ? undefined : this.expensesStore.getSupplierById(id);
  });
  readonly loading = this.expensesStore.loading;
  readonly error = this.expensesStore.error;
  readonly types = SUPPLIER_TYPES;

  readonly supplierForm = this.formBuilder.nonNullable.group({
    type: [SupplierType.COMPANY as SupplierType, Validators.required],
    businessName: ['', [Validators.required, Validators.maxLength(200)]],
    ruc: ['', rucValidators(SupplierType.COMPANY)],
    phone: ['', Validators.maxLength(30)],
  });

  constructor() {
    super();
    this.supplierForm.controls.type.valueChanges.subscribe((type) => {
      this.supplierForm.controls.ruc.setValidators(rucValidators(type));
      this.supplierForm.controls.ruc.updateValueAndValidity();
    });
    // Fill the form once the supplier being edited is available.
    effect(() => {
      const supplier = this.supplier();
      if (supplier && this.supplierForm.pristine) {
        this.supplierForm.patchValue({
          type: supplier.type,
          businessName: supplier.businessName,
          ruc: supplier.ruc,
          phone: supplier.phone,
        });
        this.lockFixedFields();
      }
    });
  }

  ngOnInit(): void {
    this.expensesStore.clearError();
    if (this.isEdit()) {
      this.lockFixedFields();
      if (!this.supplier()) {
        this.expensesStore.loadSuppliers();
      }
    }
  }

  onSubmit(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }
    const value = this.supplierForm.getRawValue();
    const supplier = new Supplier({
      id: this.supplierId() ?? 0,
      businessName: value.businessName.trim(),
      ruc: value.ruc.trim(),
      type: value.type,
      phone: value.phone.trim(),
    });
    if (this.isEdit()) {
      this.expensesStore.updateSupplier(supplier, ['/expenses/suppliers']);
    } else {
      this.expensesStore.createSupplier(supplier, ['/expenses/suppliers']);
    }
  }

  onCancel(): void {
    void this.router.navigate(['/expenses/suppliers']);
  }

  private lockFixedFields(): void {
    this.supplierForm.controls.type.disable();
    this.supplierForm.controls.ruc.disable();
  }
}
