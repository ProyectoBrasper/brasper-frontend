import { Component, computed, effect, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { ProjectsStore } from '../../../application/projects.store';
import { Client } from '../../../domain/model/client.entity';

/** Backend rule (`Ruc`): exactly 11 digits. */
const RUC_PATTERN = /^\d{11}$/;

/**
 * Create (`/projects/clients/new`) or edit (`/projects/clients/:id/edit`) a client.
 * The RUC cannot change after creation (the backend ignores it on update).
 */
@Component({
  selector: 'app-client-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './client-form.html',
})
export class ClientForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input<string>();

  readonly clientId = computed(() => (this.id() ? Number(this.id()) : null));
  readonly isEdit = computed(() => this.clientId() !== null);
  readonly client = computed(() => {
    const id = this.clientId();
    return id === null ? undefined : this.projectsStore.clients().find((c) => c.id === id);
  });
  readonly loading = this.projectsStore.loading;
  readonly error = this.projectsStore.error;

  readonly clientForm = this.formBuilder.nonNullable.group({
    businessName: ['', [Validators.required, Validators.maxLength(200)]],
    ruc: ['', [Validators.required, Validators.pattern(RUC_PATTERN)]],
    contactName: ['', Validators.maxLength(150)],
    phone: ['', Validators.maxLength(30)],
    email: ['', [Validators.email, Validators.maxLength(150)]],
  });

  constructor() {
    super();
    // Fill the form once the client being edited is available.
    effect(() => {
      const client = this.client();
      if (client && this.clientForm.pristine) {
        this.clientForm.patchValue({
          businessName: client.businessName,
          ruc: client.ruc,
          contactName: client.contactName,
          phone: client.phone,
          email: client.email,
        });
        this.clientForm.controls.ruc.disable();
      }
    });
  }

  ngOnInit(): void {
    this.projectsStore.clearError();
    if (this.isEdit()) {
      this.clientForm.controls.ruc.disable();
      if (!this.client()) {
        this.projectsStore.loadClients();
      }
    }
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }
    const value = this.clientForm.getRawValue();
    const client = new Client({
      id: this.clientId() ?? 0,
      businessName: value.businessName.trim(),
      ruc: value.ruc.trim(),
      contactName: value.contactName.trim(),
      phone: value.phone.trim(),
      email: value.email.trim(),
    });
    if (this.isEdit()) {
      this.projectsStore.updateClient(client, ['/projects/clients']);
    } else {
      this.projectsStore.createClient(client, ['/projects/clients']);
    }
  }

  onCancel(): void {
    void this.router.navigate(['/projects/clients']);
  }
}
