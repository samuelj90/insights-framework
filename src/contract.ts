import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, SankeyChart, ScatterChart, TreemapChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { parseVisualizationContract } from './contract-schema.js';
import type { KpiContract, TableContract, VisualizationContract } from './contract-schema.js';
import { DEFAULT_THEME, formatValue, toEChartsOption } from './echarts.js';
import type { VisualTheme } from './echarts.js';

echarts.use([
  BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, SankeyChart, ScatterChart, TreemapChart,
  AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, SVGRenderer,
]);

export interface RenderOptions {
  readonly theme?: Partial<VisualTheme>;
  readonly announce?: boolean;
  readonly liveRegion?: HTMLElement;
}

export interface UpdateOptions {
  readonly mode?: 'replace' | 'patch' | 'append';
  readonly throttleMs?: number;
  readonly maxPoints?: number;
}

export interface VisualizationInteraction {
  readonly type: 'select' | 'hover' | 'zoom';
  readonly name?: string;
  readonly seriesName?: string;
  readonly value?: unknown;
  readonly dataIndex?: number;
}

export interface VisualizationSnapshot {
  readonly contract: VisualizationContract;
  readonly svg?: string;
  readonly dataUrl?: string;
}

export interface RenderedVisualization {
  update(value: unknown, options?: UpdateOptions): void;
  flush(): void;
  snapshot(): VisualizationSnapshot;
  onInteraction(listener: (event: VisualizationInteraction) => void): () => void;
  destroy(): void;
}

function announce(options: RenderOptions, message: string) {
  if (!options.announce && !options.liveRegion) return;
  const region = options.liveRegion ?? document.createElement('p');
  if (!options.liveRegion) {
    region.className = 'sr-only';
    region.setAttribute('aria-live', 'polite');
  }
  region.textContent = message;
  if (!region.isConnected) document.body.append(region);
}

function limitPoints(contract: VisualizationContract, maxPoints?: number): VisualizationContract {
  if (!maxPoints || maxPoints < 1) return contract;
  if (contract.kind === 'line' || contract.kind === 'area' || contract.kind === 'stacked_bar' || contract.kind === 'grouped_bar') {
    const offset = Math.max(0, contract.categories.length - maxPoints);
    return { ...contract, categories: contract.categories.slice(offset),
      series: contract.series.map((series) => ({ ...series, values: series.values.slice(offset) })) };
  }
  if (contract.kind === 'scatter') return { ...contract, points: contract.points.slice(-maxPoints) };
  if (contract.kind === 'table') return { ...contract, rows: contract.rows.slice(-maxPoints) };
  return contract;
}

function mergeUpdate(current: VisualizationContract, value: unknown, mode: UpdateOptions['mode']): VisualizationContract {
  if (mode === 'replace' || !mode) return parseVisualizationContract(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('append and patch updates require an object.');
  if (mode === 'patch') return parseVisualizationContract({ ...current, ...(value as object) });
  if (current.kind !== 'line' && current.kind !== 'area' && current.kind !== 'stacked_bar' && current.kind !== 'grouped_bar') {
    throw new TypeError('append is available for time and series visuals only.');
  }
  const patch = value as { category: string; values: Record<string, number | null> };
  if (!patch.category || !patch.values) throw new TypeError('append requires category and values by series name.');
  return parseVisualizationContract({
    ...current,
    categories: [...current.categories, patch.category],
    series: current.series.map((series) => {
      const valueForSeries = patch.values[series.name];
      if (valueForSeries === undefined) throw new TypeError(`append is missing series '${series.name}'.`);
      return { ...series, values: [...series.values, valueForSeries] };
    }),
  });
}

function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string, text?: string) {
  const node = document.createElement(tag);
  node.dataset.part = name;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderKpi(element: HTMLElement, contract: KpiContract, options: RenderOptions = {}): RenderedVisualization {
  const figure = part('figure', 'kpi');
  const value = part('data', 'kpi-value', formatValue(contract.value));
  value.value = String(contract.value);
  figure.append(part('figcaption', 'kpi-label', contract.title), value);
  if (contract.unit) figure.append(part('span', 'kpi-unit', contract.unit));
  element.replaceChildren(figure);
  let current: VisualizationContract = contract;
  let pending: unknown;
  let timer: number | undefined;
  const apply = (value: unknown, update: UpdateOptions = {}) => {
      const next = limitPoints(mergeUpdate(current, value, update.mode), update.maxPoints);
      if (next.kind !== 'kpi') throw new TypeError('A KPI can only be updated with another KPI contract.');
      current = next;
      applyLayout(element, next.layout);
      renderKpi(element, next, options);
      announce(options, `${next.title} updated.`);
  };
  return {
    update: (value, update) => {
      if (!update?.throttleMs) { apply(value, update); return; }
      pending = value;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { timer = undefined; if (pending !== undefined) apply(pending, update); }, update.throttleMs);
    },
    flush: () => { if (timer) window.clearTimeout(timer); if (pending !== undefined) apply(pending); },
    snapshot: () => ({ contract: current }),
    onInteraction: () => () => undefined,
    destroy: () => { if (timer) window.clearTimeout(timer); element.replaceChildren(); },
  };
}

function renderTable(element: HTMLElement, contract: TableContract, options: RenderOptions = {}): RenderedVisualization {
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
  let current: VisualizationContract = contract;
  return {
    update: (value, update) => {
      const next = limitPoints(mergeUpdate(current, value, update?.mode), update?.maxPoints);
      if (next.kind !== 'table') throw new TypeError('A table can only be updated with another table contract.');
      current = next;
      applyLayout(element, next.layout);
      renderTable(element, next, options);
      announce(options, `${next.title} updated.`);
    },
    flush: () => undefined,
    snapshot: () => ({ contract: current }),
    onInteraction: () => () => undefined,
    destroy: () => element.replaceChildren(),
  };
}

export function renderVisualization(element: HTMLElement, value: unknown, options: RenderOptions = {}): RenderedVisualization {
  const contract = parseVisualizationContract(value);
  applyLayout(element, contract.layout);
  if (contract.kind === 'kpi') return renderKpi(element, contract, options);
  if (contract.kind === 'table') return renderTable(element, contract, options);

  element.replaceChildren();
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', contract.title);
  const chart = echarts.init(element, undefined, { renderer: 'svg' });
  chart.setOption(toEChartsOption(contract, { ...DEFAULT_THEME, ...options.theme }));
  requestAnimationFrame(() => chart.resize());
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize());
  observer?.observe(element);
  let current: VisualizationContract = contract;
  const listeners = new Set<(event: VisualizationInteraction) => void>();
  let pending: unknown;
  let pendingOptions: UpdateOptions = {};
  let timer: number | undefined;
  const forward = (type: VisualizationInteraction['type']) => (params: unknown) => {
    const p = params as { name?: string; seriesName?: string; value?: unknown; dataIndex?: number };
    for (const listener of listeners) listener({ type, name: p.name, seriesName: p.seriesName,
      value: p.value, dataIndex: p.dataIndex });
  };
  chart.on('click', forward('select'));
  chart.on('mouseover', forward('hover'));
  chart.on('datazoom', forward('zoom'));
  const apply = (value: unknown, update: UpdateOptions = {}) => {
    const next = limitPoints(mergeUpdate(current, value, update.mode), update.maxPoints);
    if (next.kind !== current.kind) throw new TypeError('Use destroy() and renderVisualization() before changing visual kind.');
    current = next;
    applyLayout(element, next.layout);
    chart.setOption(toEChartsOption(next, { ...DEFAULT_THEME, ...options.theme }));
    requestAnimationFrame(() => chart.resize());
    announce(options, `${next.title} updated.`);
  };
  return {
    update: (value, update = {}) => {
      if (!update.throttleMs) { apply(value, update); return; }
      pending = value;
      pendingOptions = update;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { timer = undefined; if (pending !== undefined) apply(pending, pendingOptions); pending = undefined; },
        update.throttleMs);
    },
    flush: () => {
      if (timer) window.clearTimeout(timer);
      if (pending !== undefined) apply(pending, pendingOptions);
      pending = undefined;
    },
    snapshot: () => ({
      contract: current,
      svg: element.querySelector('svg')?.outerHTML,
      dataUrl: chart.getDataURL({ type: 'svg', backgroundColor: 'transparent' }),
    }),
    onInteraction: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: () => {
      if (timer) window.clearTimeout(timer);
      observer?.disconnect();
      chart.off('click'); chart.off('mouseover'); chart.off('datazoom');
      chart.dispose();
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      element.replaceChildren();
    },
  };
}

function applyLayout(element: HTMLElement, layout: VisualizationContract['layout']) {
  element.style.minHeight = layout?.minHeight ? `${layout.minHeight}px` : '';
  element.style.maxHeight = layout?.maxHeight ? `${layout.maxHeight}px` : '';
  element.style.aspectRatio = layout?.aspectRatio ? String(layout.aspectRatio) : '';
}
