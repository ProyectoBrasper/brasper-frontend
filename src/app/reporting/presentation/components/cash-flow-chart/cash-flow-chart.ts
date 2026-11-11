import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { map } from 'rxjs/operators';
import { CashFlowLine } from '../../../domain/model/cash-flow-report';
import { CashFlowGranularity, lineDates, monthTitle, weekNumber } from '../../../domain/services/cash-flow-figures';
import { balanceChartData, CashFlowChartLabels, CHART_COLORS, flowsChartData, panelOptions } from './cash-flow-chart-data';

/**
 * The cash flow in two aligned panels: the inflows and outflows, and below them the closing balance, each on its own
 * axis. They are separate on purpose: on a shared plot with two scales the balance would seem to touch bars it has no
 * relation to. The table below the chart holds every figure.
 */
@Component({
  selector: 'app-cash-flow-chart',
  imports: [TranslatePipe, BaseChartDirective],
  templateUrl: './cash-flow-chart.html',
  styleUrl: './cash-flow-chart.css',
})
export class CashFlowChart {
  private readonly translate = inject(TranslateService);

  readonly lines = input.required<CashFlowLine[]>();
  readonly granularity = input<CashFlowGranularity>('week');

  private readonly language = toSignal(this.translate.onLangChange.pipe(map((event) => event.lang)), {
    initialValue: this.translate.getCurrentLang() ?? 'es',
  });

  readonly colors = CHART_COLORS;
  readonly flowsOptions = panelOptions('flows');
  readonly balanceOptions = panelOptions('balance');

  private readonly labels = computed<CashFlowChartLabels>(() => {
    const locale = this.language() === 'en' ? 'en-US' : 'es-PE';
    const monthly = this.granularity() === 'month';
    return {
      inflows: this.translate.instant('cashFlow.totalInflows'),
      outflows: this.translate.instant('cashFlow.totalOutflows'),
      balance: this.translate.instant('cashFlow.closingBalance'),
      column: (line) =>
        monthly
          ? monthTitle(line, locale)
          : [this.translate.instant('cashFlow.week', { number: weekNumber(line) }), lineDates(line)],
    };
  });

  readonly flowsData = computed(() => flowsChartData(this.lines(), this.labels()));
  readonly balanceData = computed(() => balanceChartData(this.lines(), this.labels()));
}
