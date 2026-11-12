import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AccountingStore } from '../../../../accounting/application/accounting.store';
import { ProjectsStore } from '../../../../projects/application/projects.store';
import { Project } from '../../../../projects/domain/model/project.entity';
import { ProjectStatus } from '../../../../projects/domain/model/project-status';
import { PERU_DATE_FORMATS, PeruDateAdapter } from '../../../../shared/presentation/peru-date-adapter';
import { BillingStore } from '../../../application/billing.store';
import { IssueInvoiceCommand } from '../../../domain/model/issue-invoice.command';
import { invoiceFixture } from '../../../testing/invoice-fixtures';
import { InvoiceForm } from './invoice-form';

const project = (id: number, status: ProjectStatus) =>
  new Project({
    id, code: `00${id}BR-FEB-2026`, name: `Proyecto ${id}`, description: '', clientId: 2, budget: 420500,
    currency: 'PEN', quotedOn: '2026-02-09', status, participation: 0.45, salesCommissionRate: 0.025,
    accumulatedProgress: 0.68, estimatedDirectCost: 250000,
  });

describe('InvoiceForm', () => {
  let issueInvoice: ReturnType<typeof vi.fn>;
  let loadTaxParametersAt: ReturnType<typeof vi.fn>;
  let component: InvoiceForm;

  beforeEach(() => {
    issueInvoice = vi.fn();
    loadTaxParametersAt = vi.fn();
    const projects = [project(2, ProjectStatus.IN_PROGRESS), project(3, ProjectStatus.QUOTED), project(6, ProjectStatus.CANCELLED)];
    TestBed.configureTestingModule({
      imports: [InvoiceForm],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'es' }),
        { provide: DateAdapter, useClass: PeruDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: PERU_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
        {
          provide: BillingStore,
          useValue: {
            invoices: signal([invoiceFixture({ number: 'F001-00000054' })]),
            loading: computed(() => false),
            error: signal(null),
            clearError: vi.fn(),
            loadInvoices: vi.fn(),
            issueInvoice,
          },
        },
        {
          provide: ProjectsStore,
          useValue: {
            projects: signal(projects),
            clients: signal([{ id: 2, businessName: 'Constructora Río Chillón S.A.C.', ruc: '20512345672' }]),
            getProjectById: (id: number) => projects.find((p) => p.id === id),
            getClientById: () => ({ id: 2, businessName: 'Constructora Río Chillón S.A.C.', ruc: '20512345672' }),
            loadProjects: vi.fn(),
            loadClients: vi.fn(),
          },
        },
        { provide: AccountingStore, useValue: { taxParameters: signal(null), loadTaxParametersAt } },
      ],
    });
    const fixture = TestBed.createComponent(InvoiceForm);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('offers only in-progress or completed projects', () => {
    expect(component.projects().map((p) => p.id)).toEqual([2]);
  });

  it('proposes the next correlative and asks for the rates of the issue date', () => {
    expect(component.invoiceForm.controls.correlative.value).toBe(55);
    expect(loadTaxParametersAt).toHaveBeenCalled();
  });

  it('enables self detraction only with a detraction', () => {
    const { hasDetraction, selfDetraction } = component.invoiceForm.controls;
    expect(selfDetraction.disabled).toBe(true);
    hasDetraction.setValue(true);
    expect(selfDetraction.enabled).toBe(true);
    selfDetraction.setValue(true);
    hasDetraction.setValue(false);
    expect([selfDetraction.disabled, selfDetraction.value]).toEqual([true, false]);
  });

  it('previews the amounts like the backend (standard rates when none are configured)', () => {
    component.invoiceForm.patchValue({ projectId: 2, taxableBase: 80000, hasRetention: true, hasDetraction: true });
    expect(component.preview().netAmount).toBe(80240);
  });

  it('issues with an upper-cased series, ISO date and the project currency', () => {
    component.invoiceForm.patchValue({
      projectId: 2,
      series: 'f001',
      issuedOn: new Date(2026, 10, 5),
      purchaseOrder: ' OC-RC-140 ',
      taxableBase: 80000,
      hasRetention: true,
      hasDetraction: true,
    });
    component.onSubmit();
    const [command, navigateTo] = issueInvoice.mock.calls[0] as [IssueInvoiceCommand, string[]];
    expect([command.series, command.correlative, command.issuedOn, command.purchaseOrder, command.currency]).toEqual([
      'F001', 55, '2026-11-05', 'OC-RC-140', 'PEN',
    ]);
    expect([command.hasRetention, command.hasDetraction, command.selfDetraction]).toEqual([true, true, false]);
    expect(navigateTo).toEqual(['/billing/invoices']);
  });
});
