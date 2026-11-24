import { arc, format, pie, select } from 'd3';
import type { PieArcDatum } from 'd3';
import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, SankeyChart, ScatterChart, TreemapChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { createChart } from './charts.js';
import type { BarData } from './charts.js';
import { parseVisualizationContract } from './contract-schema.js';
import type { KpiContract, TableContract, VisualizationContractV1 } from './contract-schema.js';
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
  destroy(): void;
}

function renderDonutV1(element: HTMLElement, contract: VisualizationContractV1): RenderedVisualization {
  element.replaceChildren();
  const root = select(element);
  const chart = root.append('svg').attr('role', 'img').attr('aria-label', contract.title)
    .attr('viewBox', '0 0 220 180').attr('width', '100%').attr('height', 180);
  const maxValue = contract.data.reduce((max, entry) => Math.max(max, entry.value), 0);
  const slices = pie<BarData>().sort(null).value((entry) => entry.value / maxValue)([...contract.data]);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const colors = DEFAULT_THEME.palette;
  const color = (index: number) => colors[index % colors.length] ?? '#6fa3cf';
  const percent = format('.1%');
  const describe = (slice: PieArcDatum<BarData>) => `${slice.data.label}: ${percent(slice.value / total)}`;
  chart.append('g').attr('transform', 'translate(110,90)').selectAll('path').data(slices).join('path')
    .attr('d', arc<PieArcDatum<BarData>>().innerRadius(46).outerRadius(80))
    .attr('fill', (_, index) => color(index)).attr('stroke', 'var(--panel, #171b1a)')
    .append('title').text(describe);
  const legend = root.append('ul').attr('class', 'chart-legend');
  const entries = legend.selectAll('li').data(slices).join('li');
  entries.append('svg').attr('aria-hidden', 'true').attr('width', 10).attr('height', 10)
    .append('circle').attr('cx', 5).attr('cy', 5).attr('r', 4).attr('fill', (_, index) => color(index));
  entries.append('span').text(describe);
  return { destroy: () => element.replaceChildren() };
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
  return { destroy: () => element.replaceChildren() };
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
  return { destroy: () => element.replaceChildren() };
}

export function renderVisualization(element: HTMLElement, value: unknown, options: RenderOptions = {}): RenderedVisualization {
  const contract = parseVisualizationContract(value);
  if (contract.version === '1') {
    return contract.kind === 'bar'
      ? createChart(element, { kind: 'bar', title: contract.title, unit: contract.unit, data: contract.data })
      : renderDonutV1(element, contract);
  }
  if (contract.kind === 'kpi') return renderKpi(element, contract);
  if (contract.kind === 'table') return renderTable(element, contract);

  element.replaceChildren();
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', contract.title);
  const chart = echarts.init(element, undefined, { renderer: 'svg' });
  chart.setOption(toEChartsOption(contract, { ...DEFAULT_THEME, ...options.theme }));
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize());
  observer?.observe(element);
  return {
    destroy: () => {
      observer?.disconnect();
      chart.dispose();
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      element.replaceChildren();
    },
  };
}
