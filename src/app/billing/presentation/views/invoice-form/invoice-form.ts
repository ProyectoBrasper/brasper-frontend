import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, untracked } from '@angular/core';
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
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { BillingStore } from '../../../application/billing.store';
import {
  formatInvoiceNumber,
  IssueInvoiceCommand,
  nextCorrelative,
} from '../../../domain/model/issue-invoice.command';
import {
  InvoiceAmountsCalculator,
  STANDARD_TAX_RATES,
  TaxRates,
} from '../../../domain/services/invoice-amounts-calculator';
import { InvoiceAmountsSummary } from '../../components/invoice-amounts-summary/invoice-amounts-summary';

/** Backend rule (`InvoiceNumber`): series of 4 letters or digits. */
const SERIES_PATTERN = /^[A-Za-z0-9]{4}$/;

/**
 * Issue an invoice (`/billing/invoices/new`, administration and accounting). The live preview uses
 * the same formulas and the tax rates in force on the issue date, like the backend.
 */
@Component({
  selector: 'app-invoice-form',
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
    PageHeader,
    InvoiceAmountsSummary,
  ],
  templateUrl: './invoice-form.html',
  styleUrl: './invoice-form.css',
})
export class InvoiceForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly billingStore = inject(BillingStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly accountingStore = inject(AccountingStore);
  private readonly router = inject(Router);

  readonly invoiceForm = this.formBuilder.group({
    projectId: this.formBuilder.control<number | null>(null, Validators.required),
    series: this.formBuilder.nonNullable.control('F001', [Validators.required, Validators.pattern(SERIES_PATTERN)]),
    correlative: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(99_999_999),
      Validators.pattern(/^\d+$/),
    ]),
    issuedOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    purchaseOrder: this.formBuilder.nonNullable.control('', Validators.maxLength(50)),
    taxableBase: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    hasRetention: this.formBuilder.nonNullable.control(false),
    hasDetraction: this.formBuilder.nonNullable.control(false),
    selfDetraction: this.formBuilder.nonNullable.control({ value: false, disabled: true }),
    advance: this.formBuilder.nonNullable.control(false),
    notes: this.formBuilder.nonNullable.control('', Validators.maxLength(1000)),
  });

  private readonly value = toSignal(this.invoiceForm.valueChanges, {
    initialValue: this.invoiceForm.getRawValue(),
  });

  readonly loading = this.billingStore.loading;
  readonly error = this.billingStore.error;
  /** Only in-progress or completed projects can be invoiced (backend rule). */
  readonly projects = computed(() =>
    this.projectsStore
      .projects()
      .filter((project) => project.canBeInvoiced())
      .sort((a, b) => a.code.localeCompare(b.code)),
  );
  readonly project = computed(() => this.projectsStore.getProjectById(Number(this.value().projectId)));
  readonly client = computed(() => {
    const project = this.project();
    return project ? this.projectsStore.getClientById(project.clientId) : undefined;
  });
  readonly currency = computed(() => this.project()?.currency ?? 'PEN');
  readonly taxParameters = this.accountingStore.taxParameters;
  readonly rates = computed<TaxRates>(() => this.accountingStore.taxParameters() ?? STANDARD_TAX_RATES);
  readonly preview = computed(() => {
    const value = this.value();
    return InvoiceAmountsCalculator.preview(
      Number(value.taxableBase),
      !!value.hasRetention,
      !!value.hasDetraction,
      this.rates(),
    );
  });
  readonly numberPreview = computed(() => {
    const { series, correlative } = this.value();
    return series && correlative ? formatInvoiceNumber(series, Number(correlative)) : '';
  });
  private readonly issuedOnIso = computed(() => {
    const date = this.value().issuedOn;
    return date instanceof Date && !Number.isNaN(date.getTime()) ? toIsoDate(date) : null;
  });

  constructor() {
    super();
    // Rates in force on the issue date (the backend uses the same date).
    effect(() => {
      const date = this.issuedOnIso();
      if (date) {
        untracked(() => this.accountingStore.loadTaxParametersAt(date));
      }
    });
    // Propose the next correlative of the series until the user types one.
    effect(() => {
      const numbers = this.billingStore.invoices().map((invoice) => invoice.number);
      const series = this.value().series ?? '';
      const control = this.invoiceForm.controls.correlative;
      if (SERIES_PATTERN.test(series) && control.pristine) {
        const next = nextCorrelative(numbers, series);
        // Only when it changes, so the value update does not re-trigger this effect in a loop.
        if (untracked(() => control.value) !== next) {
          untracked(() => control.setValue(next));
        }
      }
    });
    // Self detraction only makes sense with a detraction (backend rule).
    this.invoiceForm.controls.hasDetraction.valueChanges.subscribe((hasDetraction) => {
      const selfDetraction = this.invoiceForm.controls.selfDetraction;
      if (hasDetraction) {
        selfDetraction.enable({ emitEvent: false });
      } else {
        selfDetraction.setValue(false, { emitEvent: false });
        selfDetraction.disable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.billingStore.clearError();
    if (this.billingStore.invoices().length === 0) {
      this.billingStore.loadInvoices();
    }
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
    if (this.projectsStore.clients().length === 0) {
      this.projectsStore.loadClients();
    }
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }
    const value = this.invoiceForm.getRawValue();
    const command = new IssueInvoiceCommand({
      series: value.series.trim().toUpperCase(),
      correlative: Number(value.correlative),
      issuedOn: toIsoDate(value.issuedOn!),
      purchaseOrder: value.purchaseOrder.trim(),
      projectId: value.projectId!,
      taxableBase: Math.round(Number(value.taxableBase) * 100) / 100,
      currency: this.currency(),
      hasRetention: value.hasRetention,
      hasDetraction: value.hasDetraction,
      selfDetraction: value.hasDetraction && value.selfDetraction,
      advance: value.advance,
      notes: value.notes.trim(),
    });
    this.billingStore.issueInvoice(command, ['/billing/invoices']);
  }

  onCancel(): void {
    void this.router.navigate(['/billing/invoices']);
  }
}
