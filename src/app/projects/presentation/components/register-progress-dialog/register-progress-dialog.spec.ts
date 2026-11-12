import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { ProgressRecord } from '../../../domain/model/progress-record.entity';
import { Project } from '../../../domain/model/project.entity';
import { ProjectStatus } from '../../../domain/model/project-status';
import { RegisterProgressDialog } from './register-progress-dialog';

const project = new Project({
  id: 1, code: '001BR-ENE-2026', name: 'Ampliación', description: '', clientId: 1, budget: 850000,
  currency: 'PEN', quotedOn: '2026-01-14', status: ProjectStatus.IN_PROGRESS, participation: 0.6,
  salesCommissionRate: 0.02, accumulatedProgress: 0.72, estimatedDirectCost: 480000,
});
const october = new ProgressRecord({ id: 8, projectId: 1, year: 2026, month: 10, percentage: 0.03 });

describe('RegisterProgressDialog', () => {
  let close: ReturnType<typeof vi.fn>;
  let dialog: RegisterProgressDialog;

  beforeEach(() => {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [RegisterProgressDialog],
      providers: [
        provideTranslateService({ lang: 'es' }),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { project, records: [october] } },
      ],
    });
    dialog = TestBed.createComponent(RegisterProgressDialog).componentInstance;
  });

  it('limits the percentage to what is left to 100 %', () => {
    expect(dialog.maxPercentage).toBe(28);
    dialog.progressForm.patchValue({ year: 2026, month: 11, percentage: 30 });
    expect(dialog.progressForm.controls.percentage.hasError('max')).toBe(true);
  });

  it('rejects a month that already has progress', () => {
    dialog.progressForm.patchValue({ year: 2026, month: 10, percentage: 5 });
    expect(dialog.progressForm.hasError('periodTaken')).toBe(true);
    dialog.onSave();
    expect(close).not.toHaveBeenCalled();
  });

  it('closes with the record as a fraction and flags when it completes the project', () => {
    dialog.progressForm.patchValue({ year: 2026, month: 11, percentage: 28 });
    expect(dialog.completesProject()).toBe(true);
    dialog.onSave();
    const record = close.mock.calls[0][0] as ProgressRecord;
    expect([record.projectId, record.year, record.month, record.percentage]).toEqual([1, 2026, 11, 0.28]);
  });
});
