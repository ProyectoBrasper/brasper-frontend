import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { AccountingStore } from '../../../application/accounting.store';
import {
  createJournalLine,
  doubleEntryValidator,
  JournalLineForm,
  JournalLinesEditor,
} from '../../components/journal-lines-editor/journal-lines-editor';

/**
 * A manual entry (`/accounting/journal-entries/new`, admin and accounting): date, description and at least two lines
 * that balance, one side per line, on active accounts. The backend checks the same and sets the source to MANUAL;
 * registering opens the journal in the entry's month with it expanded.
 */
@Component({
  selector: 'app-journal-entry-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
    JournalLinesEditor,
  ],
  templateUrl: './journal-entry-form.html',
  styles: `
    .form-card + .form-card { margin-top: 24px; }
    .form-card-title { display: flex; align-items: center; gap: 8px; }
    .form-card-title mat-icon { color: var(--mat-sys-on-surface-variant); }
    .head-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 0 16px; }
    .head-grid mat-form-field { width: 100%; }
    @media (max-width: 599px) { .head-grid { grid-template-columns: 1fr; } }
  `,
})
export class JournalEntryForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accountingStore = inject(AccountingStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);

  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  /** The backend rejects an inactive account (400), so only active ones are offered, by code. */
  readonly accounts = computed(() => this.accountingStore.ledgerAccounts().filter((account) => account.active));
  readonly projects = computed(() => [...this.projectsStore.projects()].sort((a, b) => a.code.localeCompare(b.code)));

  readonly entryForm = this.formBuilder.group({
    entryDate: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    description: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(300)]),
    lines: new FormArray<JournalLineForm>([createJournalLine(), createJournalLine()], doubleEntryValidator),
  });

  private readonly status = toSignal(this.entryForm.statusChanges, { initialValue: this.entryForm.status });
  /** "Register" stays off until the entry is complete and balances (as the mockup shows). */
  readonly canSubmit = computed(() => this.status() === 'VALID' && !this.loading());

  ngOnInit(): void {
    this.accountingStore.clearError();
    if (this.accountingStore.ledgerAccounts().length === 0) {
      this.accountingStore.loadLedgerAccounts();
    }
    if (this.projectsStore.projects().length === 0) {
      this.projectsStore.loadProjects();
    }
  }

  onSubmit(): void {
    // A description of only spaces is blank for the backend (@NotBlank).
    const description = this.entryForm.controls.description;
    if (!description.value.trim()) {
      description.setValue('');
    }
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }
    const value = this.entryForm.getRawValue();
    const amount = (side: number | null) => Math.round((Number(side) || 0) * 100) / 100;
    this.accountingStore.registerJournalEntry({
      entryDate: toIsoDate(value.entryDate!),
      description: value.description.trim(),
      lines: value.lines.map((line) => ({
        accountCode: line.accountCode!,
        debit: amount(line.debit),
        credit: amount(line.credit),
        projectId: line.projectId ?? null,
      })),
    });
  }

  onCancel(): void {
    void this.router.navigate(['/accounting/journal-entries']);
  }
}
