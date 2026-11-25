import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, SankeyChart, ScatterChart, TreemapChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { parseVisualizationContract } from './contract-schema.js';
import type { KpiContract, TableContract } from './contract-schema.js';
import { DEFAULT_THEME, formatValue, toEChartsOption } from './echarts.js';
import type { VisualTheme } from './echarts.js';

echarts.use([
  BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, SankeyChart, ScatterChart, TreemapChart,
  AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, SVGRenderer,
]);

export interface RenderOptions {
  readonly theme?: Partial<VisualTheme>;
}

export interface RenderedVisualization {
  update(value: unknown, options?: RenderOptions): void;
  destroy(): void;
}

function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string, text?: string) {
  const node = document.createElement(tag);
  node.dataset.part = name;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderKpi(element: HTMLElement, contract: KpiContract): RenderedVisualization {
  const figure = part('figure', 'kpi');
  const value = part('data', 'kpi-value', formatValue(contract.value));
  value.value = String(contract.value);
  figure.append(part('figcaption', 'kpi-label', contract.title), value);
  if (contract.unit) figure.append(part('span', 'kpi-unit', contract.unit));
  element.replaceChildren(figure);
  return {
    update: (value) => {
      const next = parseVisualizationContract(value);
      if (next.kind !== 'kpi') throw new TypeError('A KPI can only be updated with another KPI contract.');
      renderKpi(element, next);
    },
    destroy: () => element.replaceChildren(),
  };
}

function renderTable(element: HTMLElement, contract: TableContract): RenderedVisualization {
  const table = part('table', 'table');
  table.setAttribute('aria-label', contract.title);
  const head = table.createTHead().insertRow();
  const numeric = contract.columns.map((_, index) => contract.rows.some((row) => typeof row[index] === 'number'));
  contract.columns.forEach((column, index) => {
    const cell = part('th', 'table-head', column);
    cell.scope = 'col';
    if (numeric[index]) cell.dataset.numeric = '';
    head.append(cell);
  });
  const body = table.createTBody();
  for (const row of contract.rows) {
    const tr = body.insertRow();
    row.forEach((value, index) => {
      const cell = part('td', 'table-cell', typeof value === 'number' ? formatValue(value) : value ?? '—');
      if (numeric[index]) cell.dataset.numeric = '';
      tr.append(cell);
    });
  }
  const scroll = part('div', 'table-scroll');
  scroll.append(table);
  element.replaceChildren(scroll);
  return {
    update: (value) => {
      const next = parseVisualizationContract(value);
      if (next.kind !== 'table') throw new TypeError('A table can only be updated with another table contract.');
      renderTable(element, next);
    },
    destroy: () => element.replaceChildren(),
  };
}

export function renderVisualization(element: HTMLElement, value: unknown, options: RenderOptions = {}): RenderedVisualization {
  const contract = parseVisualizationContract(value);
  if (contract.kind === 'kpi') return renderKpi(element, contract);
  if (contract.kind === 'table') return renderTable(element, contract);

  element.replaceChildren();
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', contract.title);
  const chart = echarts.init(element, undefined, { renderer: 'svg' });
  chart.setOption(toEChartsOption(contract, { ...DEFAULT_THEME, ...options.theme }));
  requestAnimationFrame(() => chart.resize());
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize());
  observer?.observe(element);
  return {
    update: (value, nextOptions = options) => {
      const next = parseVisualizationContract(value);
      if (next.kind !== contract.kind) {
        throw new TypeError('Use destroy() and renderVisualization() before changing visual kind.');
      }
      chart.setOption(toEChartsOption(next, { ...DEFAULT_THEME, ...nextOptions.theme }), true);
      requestAnimationFrame(() => chart.resize());
    },
    destroy: () => {
      observer?.disconnect();
      chart.dispose();
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      element.replaceChildren();
    },
  };
}
