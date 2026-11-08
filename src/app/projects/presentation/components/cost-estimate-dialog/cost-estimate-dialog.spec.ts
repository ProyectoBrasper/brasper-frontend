import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { CostCategory } from '../../../domain/model/cost-category';
import { CostEstimate } from '../../../domain/model/cost-estimate.entity';
import { CostEstimateData, CostEstimateDialog } from './cost-estimate-dialog';

describe('CostEstimateDialog', () => {
  let close: ReturnType<typeof vi.fn>;

  const create = (data: CostEstimateData) => {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [CostEstimateDialog],
      providers: [
        provideTranslateService({ lang: 'es' }),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    return TestBed.createComponent(CostEstimateDialog).componentInstance;
  };

  it('offers only categories without an estimate when adding', () => {
    const dialog = create({
      projectId: 3,
      currency: 'PEN',
      estimate: null,
      usedCategories: [CostCategory.MATERIALS, CostCategory.LABOR],
    });
    expect(dialog.categories).toEqual([CostCategory.TRAVEL_EXPENSES, CostCategory.OTHER]);
    expect(dialog.estimateForm.controls.category.value).toBe(CostCategory.TRAVEL_EXPENSES);
  });

  it('keeps the category locked when editing and closes with the rounded amount', () => {
    const existing = new CostEstimate({ id: 4, projectId: 1, category: CostCategory.OTHER, estimatedAmount: 35000 });
    const dialog = create({ projectId: 1, currency: 'PEN', estimate: existing, usedCategories: [CostCategory.OTHER] });
    expect(dialog.estimateForm.controls.category.disabled).toBe(true);
    dialog.estimateForm.controls.estimatedAmount.setValue(40000.555);
    dialog.onSave();
    const saved = close.mock.calls[0][0] as CostEstimate;
    expect([saved.id, saved.category, saved.estimatedAmount]).toEqual([4, CostCategory.OTHER, 40000.56]);
  });

  it('rejects negative amounts', () => {
    const dialog = create({ projectId: 1, currency: 'PEN', estimate: null, usedCategories: [] });
    dialog.estimateForm.controls.estimatedAmount.setValue(-1);
    dialog.onSave();
    expect(close).not.toHaveBeenCalled();
  });
});
