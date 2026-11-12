import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, OnInit, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AccountingStore } from '../../../../accounting/application/accounting.store';
import { STANDARD_TAX_RATES } from '../../../../billing/domain/services/invoice-amounts-calculator';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { COST_CATEGORIES, CostCategory } from '../../../../projects/domain/model/cost-category';
import { ProjectStatus } from '../../../../projects/domain/model/project-status';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../../treasury/application/treasury.store';
import { BankAccount } from '../../../../treasury/domain/model/bank-account.entity';
import { ExpensesStore } from '../../../application/expenses.store';
import { PAYMENT_METHODS, PaymentMethod } from '../../../domain/model/payment-method';
import { VOUCHER_TYPES, VoucherType } from '../../../domain/model/voucher-type';
import { ExpenseAmountsCalculator } from '../../../domain/services/expense-amounts-calculator';
import { accountsFor, needsAccount, needsPartner } from '../../../domain/services/payment-rules';

/**
 * Register an expense (`/expenses/new`) or correct one (`/expenses/:id/edit`). Registering takes the
 * voucher, the amount and how it was paid; the backend calculates base, IGV (only for an invoice) and
 * total. Once registered, only the category, the project and the description can change: to fix an
 * amount, annul the expense and register it again.
 */
@Component({
  selector: 'app-expense-form',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.css',
})
export class ExpenseForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly expensesStore = inject(ExpensesStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly accountingStore = inject(AccountingStore);
  private readonly router = inject(Router);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input<string>();

  readonly expenseId = computed(() => (this.id() ? Number(this.id()) : null));
  readonly isEdit = computed(() => this.expenseId() !== null);
  readonly expense = computed(() => {
    const id = this.expenseId();
    return id === null ? undefined : this.expensesStore.getExpenseById(id);
  });

  readonly categories = COST_CATEGORIES;
  readonly voucherTypes = VOUCHER_TYPES;
  readonly paymentMethods = PAYMENT_METHODS;

  readonly expenseForm = this.formBuilder.group({
    spentOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    projectId: this.formBuilder.control<number | null>(null),
    supplierId: this.formBuilder.control<number | null>(null),
    category: this.formBuilder.nonNullable.control<CostCategory>(CostCategory.MATERIALS, Validators.required),
    description: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
    voucherType: this.formBuilder.nonNullable.control<VoucherType>(VoucherType.INVOICE, Validators.required),
    voucherNumber: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(30)]),
    amount: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    amountIncludesIgv: this.formBuilder.nonNullable.control(false),
    paymentMethod: this.formBuilder.nonNullable.control<PaymentMethod>(PaymentMethod.BANK_ACCOUNT, Validators.required),
    bankAccountId: this.formBuilder.control<number | null>(null, Validators.required),
    partnerId: this.formBuilder.control<number | null>({ value: null, disabled: true }, Validators.required),
    paid: this.formBuilder.nonNullable.control(true),
  });

  private readonly value = toSignal(this.expenseForm.valueChanges, { initialValue: this.expenseForm.getRawValue() });

  readonly loading = computed(
    () => this.expensesStore.loading() || this.projectsStore.loading() || this.treasuryStore.loading(),
  );
  readonly error = computed(() => this.expensesStore.error() ?? this.projectsStore.error() ?? this.treasuryStore.error());
  readonly canChoosePayment = this.expensesStore.canChoosePayment;
  /** An engineer cannot read accounts or partners, so cannot register a new expense (see the store). */
  readonly blocked = computed(() => !this.isEdit() && !this.canChoosePayment());
  readonly suppliers = computed(() =>
    [...this.expensesStore.suppliers()].sort((a, b) => a.businessName.localeCompare(b.businessName)),
  );
  /** Cancelled projects take no new expenses (backend rule); the one already chosen stays listed. */
  readonly projects = computed(() => {
    const current = this.expense()?.projectId ?? null;
    return this.projectsStore
      .projects()
      .filter((project) => project.status !== ProjectStatus.CANCELLED || project.id === current)
      .sort((a, b) => a.code.localeCompare(b.code));
  });
  readonly partners = this.treasuryStore.partners;
  readonly accounts = computed(() => accountsFor(this.value().paymentMethod ?? PaymentMethod.BANK_ACCOUNT, this.treasuryStore.bankAccounts()));
  readonly isInvoice = computed(() => this.value().voucherType === VoucherType.INVOICE);
  readonly withAccount = computed(() => needsAccount(this.value().paymentMethod ?? PaymentMethod.BANK_ACCOUNT));
  readonly taxParameters = this.accountingStore.taxParameters;
  readonly rates = computed(() => this.accountingStore.taxParameters() ?? STANDARD_TAX_RATES);
  /** New: live preview with the rates in force on the date. Edit: the amounts the backend already calculated. */
  readonly preview = computed(() => {
    const expense = this.expense();
    if (this.isEdit()) {
      return expense
        ? { taxableBase: expense.taxableBase, igv: expense.igv, total: expense.total }
        : { taxableBase: 0, igv: 0, total: 0 };
    }
    const value = this.value();
    return ExpenseAmountsCalculator.preview(
      Number(value.amount),
      value.voucherType ?? VoucherType.INVOICE,
      !!value.amountIncludesIgv,
      this.rates(),
    );
  });
  readonly currency = computed(() => this.expense()?.currency ?? 'PEN');
  readonly supplierName = computed(() => this.expensesStore.getSupplierById(this.expense()?.supplierId ?? null)?.businessName ?? '');
  readonly accountOfExpense = computed(() => this.treasuryStore.getBankAccountById(this.expense()?.bankAccountId ?? null));
  readonly partnerOfExpense = computed(() => this.treasuryStore.getPartnerById(this.expense()?.partnerId ?? null));
  private readonly spentOnIso = computed(() => {
    const date = this.value().spentOn;
    return date instanceof Date && !Number.isNaN(date.getTime()) ? toIsoDate(date) : null;
  });

  constructor() {
    super();
    // Rates in force on the spending date (the backend uses the same date).
    effect(() => {
      const date = this.spentOnIso();
      if (date && !this.isEdit() && this.canChoosePayment()) {
        untracked(() => this.accountingStore.loadTaxParametersAt(date));
      }
    });
    // Without a voucher there is no number; any other voucher needs one.
    this.expenseForm.controls.voucherType.valueChanges.subscribe((type) => this.applyVoucher(type));
    // A bank or petty cash payment names the account; a partner contribution names the partner.
    this.expenseForm.controls.paymentMethod.valueChanges.subscribe((method) => this.applyPaymentMethod(method));
    // Fill the form once the expense being corrected is available.
    effect(() => {
      const expense = this.expense();
      if (expense && this.isEdit() && this.expenseForm.pristine) {
        untracked(() => {
          this.expenseForm.patchValue({
            spentOn: fromIsoDate(expense.spentOn),
            projectId: expense.projectId,
            category: expense.category,
            description: expense.description,
          });
          this.lockFixedFields();
        });
      }
    });
  }

  ngOnInit(): void {
    this.expensesStore.clearError();
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
    if (this.expensesStore.suppliers().length === 0) {
      this.expensesStore.loadSuppliers();
    }
    if (this.isEdit()) {
      this.lockFixedFields();
      this.expensesStore.loadExpense(this.expenseId()!);
    }
    if (this.canChoosePayment()) {
      if (this.treasuryStore.bankAccounts().length === 0) {
        this.treasuryStore.loadBankAccounts();
      }
      if (this.treasuryStore.partners().length === 0) {
        this.treasuryStore.loadPartners();
      }
    }
    this.applyVoucher(this.expenseForm.controls.voucherType.value);
    this.applyPaymentMethod(this.expenseForm.controls.paymentMethod.value);
  }

  onSubmit(): void {
    if (this.blocked()) {
      return;
    }
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }
    const value = this.expenseForm.getRawValue();
    const projectId = value.projectId ?? null;
    if (this.isEdit()) {
      this.expensesStore.correctExpense(
        this.expenseId()!,
        { projectId, category: value.category, description: value.description },
        ['/expenses'],
      );
      return;
    }
    this.expensesStore.registerExpense(
      {
        spentOn: toIsoDate(value.spentOn!),
        projectId,
        supplierId: value.supplierId ?? null,
        category: value.category,
        description: value.description,
        voucherType: value.voucherType,
        voucherNumber: value.voucherType === VoucherType.NO_VOUCHER ? '' : value.voucherNumber,
        amount: Math.round(Number(value.amount) * 100) / 100,
        amountIncludesIgv: this.isInvoice() && value.amountIncludesIgv,
        currency: 'PEN',
        paymentMethod: value.paymentMethod,
        bankAccountId: needsAccount(value.paymentMethod) ? value.bankAccountId : null,
        partnerId: needsPartner(value.paymentMethod) ? value.partnerId : null,
        paid: value.paid,
      },
      ['/expenses'],
    );
  }

  onCancel(): void {
    void this.router.navigate(['/expenses']);
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }

  private applyVoucher(type: VoucherType): void {
    const number = this.expenseForm.controls.voucherNumber;
    const includesIgv = this.expenseForm.controls.amountIncludesIgv;
    if (this.isEdit()) {
      return;
    }
    if (type === VoucherType.NO_VOUCHER) {
      number.setValue('');
      number.disable({ emitEvent: false });
    } else {
      number.enable({ emitEvent: false });
    }
    if (type === VoucherType.INVOICE) {
      includesIgv.enable({ emitEvent: false });
    } else {
      includesIgv.setValue(false, { emitEvent: false });
      includesIgv.disable({ emitEvent: false });
    }
  }

  private applyPaymentMethod(method: PaymentMethod): void {
    if (this.isEdit()) {
      return;
    }
    const account = this.expenseForm.controls.bankAccountId;
    const partner = this.expenseForm.controls.partnerId;
    if (needsPartner(method)) {
      account.setValue(null, { emitEvent: false });
      account.disable({ emitEvent: false });
      partner.enable({ emitEvent: false });
    } else {
      partner.setValue(null, { emitEvent: false });
      partner.disable({ emitEvent: false });
      account.enable({ emitEvent: false });
      // The account chosen for another method may not be valid for this one.
      const valid = accountsFor(method, this.treasuryStore.bankAccounts()).some((a) => a.id === account.value);
      if (!valid) {
        account.setValue(null, { emitEvent: false });
      }
    }
  }

  /** Editing: everything but the category, project and description is fixed. */
  private lockFixedFields(): void {
    const { projectId, category, description } = this.expenseForm.controls;
    for (const control of Object.values(this.expenseForm.controls)) {
      if (control !== projectId && control !== category && control !== description) {
        control.disable({ emitEvent: false });
        control.clearValidators();
        control.updateValueAndValidity({ emitEvent: false });
      }
    }
  }
}
