import { Component, computed, effect, inject, input, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { SUPPORTED_CURRENCIES } from '../../../../shared/domain/model/money';
import { toFraction, toPercent } from '../../../../shared/domain/model/percentage';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ProjectsStore } from '../../../application/projects.store';
import { PROJECT_CODE_PATTERN, Project } from '../../../domain/model/project.entity';
import { ProjectStatus } from '../../../domain/model/project-status';


/** Case-insensitive project code check (it is upper-cased on save, like the backend). */
const projectCodeValidator = (control: AbstractControl): ValidationErrors | null =>
  !control.value || PROJECT_CODE_PATTERN.test(String(control.value).trim().toUpperCase())
    ? null
    : { projectCode: true };

/**
 * Create (`/projects/new`, always quoted) or edit (`/projects/:id/edit`, only open projects) a project.
 * Percentages are typed in % and sent as fractions. On edit, code, client, currency and quote date
 * are locked (the backend only updates name, description, budget, participation and commission).
 */
@Component({
  selector: 'app-project-form',
  imports: [
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
  templateUrl: './project-form.html',
  styleUrl: './project-form.css',
})
export class ProjectForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input<string>();

  /** Only PEN for now (backend `Currency.isSupported()`); the select is shown locked. */
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly projectId = computed(() => (this.id() ? Number(this.id()) : null));
  readonly isEdit = computed(() => this.projectId() !== null);
  readonly project = computed(() => {
    const id = this.projectId();
    return id === null ? undefined : this.projectsStore.projects().find((p) => p.id === id);
  });
  /** A completed or cancelled project cannot be edited (backend rule). */
  readonly isLocked = computed(() => !!this.project() && !this.project()!.isOpen());
  readonly clients = computed(() =>
    [...this.projectsStore.clients()].sort((a, b) => a.businessName.localeCompare(b.businessName, 'es')),
  );
  readonly loading = this.projectsStore.loading;
  readonly error = this.projectsStore.error;

  readonly projectForm = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, projectCodeValidator]),
    quotedOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    description: this.formBuilder.nonNullable.control('', Validators.maxLength(1000)),
    clientId: this.formBuilder.control<number | null>(null, Validators.required),
    currency: this.formBuilder.nonNullable.control<string>(
      { value: SUPPORTED_CURRENCIES[0], disabled: SUPPORTED_CURRENCIES.length === 1 },
      Validators.required,
    ),
    budget: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    participation: this.formBuilder.control<number | null>(100, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(100),
    ]),
    salesCommissionRate: this.formBuilder.control<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
  });

  constructor() {
    super();
    // Fill the form once the project being edited is available.
    effect(() => {
      const project = this.project();
      if (project && this.projectForm.pristine) {
        this.projectForm.patchValue({
          code: project.code,
          quotedOn: fromIsoDate(project.quotedOn),
          name: project.name,
          description: project.description,
          clientId: project.clientId,
          currency: project.currency,
          budget: project.budget,
          participation: toPercent(project.participation),
          salesCommissionRate: toPercent(project.salesCommissionRate),
        });
        this.lockCreationFields();
        if (!project.isOpen()) {
          this.projectForm.disable();
        }
      }
    });
  }

  ngOnInit(): void {
    this.projectsStore.clearError();
    if (this.projectsStore.clients().length === 0) {
      this.projectsStore.loadClients();
    }
    if (this.isEdit()) {
      this.lockCreationFields();
      if (!this.project()) {
        this.projectsStore.loadProjects();
      }
    }
  }

  onSubmit(): void {
    if (this.isLocked()) {
      return;
    }
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }
    const value = this.projectForm.getRawValue();
    const existing = this.project();
    const project = new Project({
      id: existing?.id ?? 0,
      code: value.code.trim().toUpperCase(),
      name: value.name.trim(),
      description: value.description.trim(),
      clientId: value.clientId!,
      budget: Number(value.budget),
      currency: value.currency,
      quotedOn: toIsoDate(value.quotedOn!),
      status: existing?.status ?? ProjectStatus.QUOTED,
      participation: toFraction(Number(value.participation)),
      salesCommissionRate: toFraction(Number(value.salesCommissionRate)),
      accumulatedProgress: existing?.accumulatedProgress ?? 0,
      estimatedDirectCost: existing?.estimatedDirectCost ?? 0,
    });
    if (this.isEdit()) {
      this.projectsStore.updateProject(project, ['/projects']);
    } else {
      this.projectsStore.createProject(project, ['/projects']);
    }
  }

  onCancel(): void {
    void this.router.navigate(['/projects']);
  }

  /** Message for the code field, which has its own format error. */
  codeError(): string {
    return this.projectForm.controls.code.hasError('projectCode')
      ? this.translate.instant('projects.codeFormat')
      : this.errorMessageForControl(this.projectForm, 'code');
  }

  private lockCreationFields(): void {
    for (const name of ['code', 'quotedOn', 'clientId', 'currency'] as const) {
      this.projectForm.controls[name].disable({ emitEvent: false });
    }
  }
}
