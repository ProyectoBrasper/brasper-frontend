import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { CASH_FLOW_INFLOWS, CASH_FLOW_OUTFLOWS, CashFlowLine } from '../../../domain/model/cash-flow-report';
import {
  CashFlowGranularity,
  conceptsWithMovement,
  lineDates,
  lineState,
  monthTitle,
  weekNumber,
} from '../../../domain/services/cash-flow-figures';

/**
 * The cash flow as in the company's Excel: concepts in rows, weeks or months in columns, from the opening to the
 * closing balance.
 * Only concepts with movement appear. Columns that are not fully real are told apart.
 */
@Component({
  selector: 'app-cash-flow-table',
  imports: [TranslatePipe, MoneyPipe, StatusChip],
  templateUrl: './cash-flow-table.html',
  styleUrl: './cash-flow-table.css',
})
export class CashFlowTable {
  private readonly translate = inject(TranslateService);

  readonly lines = input.required<CashFlowLine[]>();
  readonly granularity = input<CashFlowGranularity>('week');

  readonly inflowConcepts = computed(() => conceptsWithMovement(CASH_FLOW_INFLOWS, this.lines(), (line) => line.inflows));
  readonly outflowConcepts = computed(() => conceptsWithMovement(CASH_FLOW_OUTFLOWS, this.lines(), (line) => line.outflows));
  readonly columns = computed(() =>
    this.lines().map((line) => ({ line, number: weekNumber(line), dates: lineDates(line), state: lineState(line) })),
  );

  month(line: CashFlowLine): string {
    return monthTitle(line, this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  }
}
