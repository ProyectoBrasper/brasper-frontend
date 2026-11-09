import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { Project } from '../../../../projects/domain/model/project.entity';
import { ProjectStatus } from '../../../../projects/domain/model/project-status';
import { PERU_DATE_FORMATS, PeruDateAdapter } from '../../../../shared/presentation/peru-date-adapter';
import { ScheduledCollection, ScheduleStatus } from '../../../domain/model/scheduled-collection.entity';
import { ScheduledCollectionData, ScheduledCollectionDialog } from './scheduled-collection-dialog';

const project = (id: number, status: ProjectStatus) =>
  new Project({
    id, code: `00${id}BR-ABR-2026`, name: `Proyecto ${id}`, description: '', clientId: 4, budget: 630000,
    currency: 'PEN', quotedOn: '2026-04-06', status, participation: 0.55, salesCommissionRate: 0.015,
    accumulatedProgress: 0.45, estimatedDirectCost: 330000,
  });

describe('ScheduledCollectionDialog', () => {
  let close: ReturnType<typeof vi.fn>;

  const create = (data: ScheduledCollectionData) => {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ScheduledCollectionDialog],
      providers: [
        provideTranslateService({ lang: 'es' }),
        { provide: DateAdapter, useClass: PeruDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: PERU_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    return TestBed.createComponent(ScheduledCollectionDialog).componentInstance;
  };

  it('schedules with the PEN currency and an ISO date, and shows the week of the date', () => {
    const dialog = create({
      collection: null,
      projects: [project(4, ProjectStatus.IN_PROGRESS), project(6, ProjectStatus.CANCELLED)],
      defaultDate: new Date(2026, 10, 30),
    });
    expect(dialog.projects.map((p) => p.id)).toEqual([4]);
    expect(dialog.week()?.number).toBe(6);
    dialog.collectionForm.patchValue({ projectId: 4, expectedAmount: 259600, notes: ' Neto ' });
    dialog.onSave();
    expect(close).toHaveBeenCalledWith({
      projectId: 4, expectedAmount: 259600, currency: 'PEN', expectedOn: '2026-11-30', notes: 'Neto',
    });
  });

  it('reschedules with only the new date (project and amount locked)', () => {
    const collection = new ScheduledCollection({
      id: 3, projectId: 2, expectedAmount: 64608, currency: 'PEN', year: 2026, month: 11, week: 2,
      status: ScheduleStatus.SCHEDULED, invoiceId: null, notes: '',
    });
    const dialog = create({ collection, projects: [], defaultDate: new Date(2026, 10, 2) });
    expect(dialog.collectionForm.controls.projectId.disabled).toBe(true);
    expect(dialog.collectionForm.controls.expectedAmount.disabled).toBe(true);
    dialog.collectionForm.controls.expectedOn.setValue(new Date(2026, 11, 16));
    expect(dialog.week()?.number).toBe(3);
    dialog.onSave();
    expect(close).toHaveBeenCalledWith({ expectedOn: '2026-12-16' });
  });
});
