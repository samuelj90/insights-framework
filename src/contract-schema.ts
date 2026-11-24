import type { BarData } from './charts.js';
import { KIND_RULES, isVisualKind } from './kinds.js';
import type { VisualKind } from './kinds.js';

export interface VisualizationContractV1 {
  readonly version: '1';
  readonly kind: 'bar' | 'donut';
  readonly title: string;
  readonly unit: string;
  readonly data: readonly BarData[];
}

interface Base<K extends VisualKind> {
  readonly version: '2';
  readonly kind: K;
  readonly title: string;
  readonly unit: string;
}

export type Cell = string | number | null;
export type Series = { readonly name: string; readonly values: readonly (number | null)[] };

export type KpiContract = Base<'kpi'> & { readonly value: number };
export type CategoryContract = Base<'bar' | 'column' | 'donut' | 'treemap' | 'funnel'> & { readonly data: readonly BarData[] };
export type SeriesContract = Base<'line' | 'area' | 'stacked_bar' | 'grouped_bar'> & {
  readonly categories: readonly string[];
  readonly series: readonly Series[];
};
export type HeatmapContract = Base<'heatmap'> & {
  readonly x: readonly string[];
  readonly y: readonly string[];
  readonly cells: readonly { readonly x: string; readonly y: string; readonly value: number }[];
};
export type ScatterContract = Base<'scatter'> & {
  readonly axes: { readonly x: string; readonly y: string };
  readonly points: readonly { readonly label: string; readonly x: number; readonly y: number }[];
};
export type SankeyContract = Base<'sankey'> & {
  readonly links: readonly { readonly source: string; readonly target: string; readonly value: number }[];
};
export type TableContract = Base<'table'> & { readonly columns: readonly string[]; readonly rows: readonly (readonly Cell[])[] };

export type VisualizationContractV2 =
  | KpiContract | CategoryContract | SeriesContract | HeatmapContract | ScatterContract | SankeyContract | TableContract;

export type VisualizationContract = VisualizationContractV1 | VisualizationContractV2;

const FIELDS: Record<VisualKind, readonly string[]> = {
  kpi: ['value'],
  bar: ['data'], column: ['data'], donut: ['data'], treemap: ['data'], funnel: ['data'],
  line: ['categories', 'series'], area: ['categories', 'series'],
  stacked_bar: ['categories', 'series'], grouped_bar: ['categories', 'series'],
  heatmap: ['x', 'y', 'cells'],
  scatter: ['axes', 'points'],
  sankey: ['links'],
  table: ['columns', 'rows'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keysMatch(value: Record<string, unknown>, expected: readonly string[]) {
  return Object.keys(value).length === expected.length && expected.every((key) => key in value);
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isFinite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function fail(message: string): never {
  throw new TypeError(`Invalid visualization contract: ${message}`);
}

function labels(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isText)) fail(`${name} requires non-empty labels.`);
  if (new Set(value).size !== value.length) fail(`${name} labels must be unique.`);
  return [...value];
}

function parseV1(value: Record<string, unknown>): VisualizationContractV1 {
  if (!keysMatch(value, ['version', 'kind', 'title', 'unit', 'data'])
    || (value.kind !== 'bar' && value.kind !== 'donut')
    || !isText(value.title) || typeof value.unit !== 'string' || !Array.isArray(value.data) || value.data.length === 0) {
    fail('expected a version 1 bar or donut chart.');
  }
  const data = value.data.map((entry: unknown) => {
    if (!isRecord(entry) || !keysMatch(entry, ['label', 'value']) || !isText(entry.label)
      || !isFinite(entry.value) || entry.value < 0) {
      fail('chart data requires a label and non-negative finite value.');
    }
    return { label: entry.label, value: entry.value };
  });
  if (value.kind === 'donut' && !data.some((entry) => entry.value > 0)) fail('a donut requires a positive total.');
  return { version: '1', kind: value.kind, title: value.title, unit: value.unit, data };
}

function parseV2(value: Record<string, unknown>): VisualizationContractV2 {
  const kind = value.kind;
  if (!isVisualKind(kind)) fail('unsupported version 2 kind.');
  if (!keysMatch(value, ['version', 'kind', 'title', 'unit', ...FIELDS[kind]])) {
    fail(`a ${kind} requires exactly version, kind, title, unit and ${FIELDS[kind].join(', ')}.`);
  }
  if (!isText(value.title) || typeof value.unit !== 'string') fail('a title and unit are required.');
  const base = { version: '2' as const, title: value.title, unit: value.unit };
  const additive = KIND_RULES[kind].additive;

  switch (kind) {
    case 'kpi':
      if (!isFinite(value.value)) fail('a KPI requires a finite value.');
      return { ...base, kind, value: value.value };
    case 'bar': case 'column': case 'donut': case 'treemap': case 'funnel': {
      if (!Array.isArray(value.data) || value.data.length === 0) fail(`a ${kind} requires data.`);
      const data = value.data.map((entry: unknown) => {
        if (!isRecord(entry) || !keysMatch(entry, ['label', 'value']) || !isText(entry.label) || !isFinite(entry.value)) {
          fail('category data requires a label and finite value.');
        }
        if (additive && entry.value < 0) fail(`a ${kind} requires non-negative values.`);
        return { label: entry.label, value: entry.value };
      });
      if (additive && !data.some((entry) => entry.value > 0)) fail(`a ${kind} requires a positive total.`);
      return { ...base, kind, data };
    }
    case 'line': case 'area': case 'stacked_bar': case 'grouped_bar': {
      const categories = labels(value.categories, 'categories');
      if (!Array.isArray(value.series) || value.series.length === 0) fail('series are required.');
      const series = value.series.map((entry: unknown) => {
        if (!isRecord(entry) || !keysMatch(entry, ['name', 'values']) || !isText(entry.name)
          || !Array.isArray(entry.values) || entry.values.length !== categories.length
          || !entry.values.every((item) => item === null || isFinite(item))) {
          fail('each series requires a name and one finite value or null per category.');
        }
        const values = entry.values as (number | null)[];
        if (additive && values.some((item) => item !== null && item < 0)) fail(`a ${kind} requires non-negative values.`);
        return { name: entry.name, values: [...values] };
      });
      if (new Set(series.map((entry) => entry.name)).size !== series.length) fail('series names must be unique.');
      return { ...base, kind, categories, series };
    }
    case 'heatmap': {
      const x = labels(value.x, 'x');
      const y = labels(value.y, 'y');
      if (!Array.isArray(value.cells) || value.cells.length === 0) fail('a heatmap requires cells.');
      const seen = new Set<string>();
      const cells = value.cells.map((entry: unknown) => {
        if (!isRecord(entry) || !keysMatch(entry, ['x', 'y', 'value']) || typeof entry.x !== 'string'
          || typeof entry.y !== 'string' || !x.includes(entry.x) || !y.includes(entry.y) || !isFinite(entry.value)) {
          fail('heatmap cells require known x and y labels and a finite value.');
        }
        const key = JSON.stringify([entry.x, entry.y]);
        if (seen.has(key)) fail('heatmap cells must be unique.');
        seen.add(key);
        return { x: entry.x, y: entry.y, value: entry.value };
      });
      return { ...base, kind, x, y, cells };
    }
    case 'scatter': {
      const axes = value.axes;
      if (!isRecord(axes) || !keysMatch(axes, ['x', 'y']) || !isText(axes.x) || !isText(axes.y)) fail('scatter axes need names.');
      if (!Array.isArray(value.points) || value.points.length === 0) fail('a scatter requires points.');
      const points = value.points.map((entry: unknown) => {
        if (!isRecord(entry) || !keysMatch(entry, ['label', 'x', 'y']) || !isText(entry.label)
          || !isFinite(entry.x) || !isFinite(entry.y)) fail('scatter points require a label and finite x and y.');
        return { label: entry.label, x: entry.x, y: entry.y };
      });
      return { ...base, kind, axes: { x: axes.x, y: axes.y }, points };
    }
    case 'sankey': {
      if (!Array.isArray(value.links) || value.links.length === 0) fail('a sankey requires links.');
      const links = value.links.map((entry: unknown) => {
        if (!isRecord(entry) || !keysMatch(entry, ['source', 'target', 'value']) || !isText(entry.source)
          || !isText(entry.target) || entry.source === entry.target || !isFinite(entry.value) || entry.value <= 0) {
          fail('sankey links require distinct source and target names and a positive value.');
        }
        return { source: entry.source, target: entry.target, value: entry.value };
      });
      if (hasCycle(links)) fail('sankey links must not form a cycle.');
      return { ...base, kind, links };
    }
    case 'table': {
      const columns = labels(value.columns, 'columns');
      if (!Array.isArray(value.rows)) fail('a table requires rows.');
      const rows = value.rows.map((row: unknown) => {
        if (!Array.isArray(row) || row.length !== columns.length
          || !row.every((cell) => cell === null || typeof cell === 'string' || isFinite(cell))) {
          fail('each table row requires one string, finite number or null per column.');
        }
        return [...row] as Cell[];
      });
      return { ...base, kind, columns, rows };
    }
  }
}

function hasCycle(links: readonly { source: string; target: string }[]) {
  const next = new Map<string, string[]>();
  for (const { source, target } of links) next.set(source, [...(next.get(source) ?? []), target]);
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (node: string): boolean => {
    if (state.get(node) === 'visiting') return true;
    if (state.get(node) === 'done') return false;
    state.set(node, 'visiting');
    const cyclic = (next.get(node) ?? []).some(visit);
    state.set(node, 'done');
    return cyclic;
  };
  return [...next.keys()].some(visit);
}

export function parseVisualizationContract(value: unknown): VisualizationContract {
  if (!isRecord(value)) fail('expected an object.');
  if (value.version === '1') return parseV1(value);
  if (value.version === '2') return parseV2(value);
  fail('unsupported version.');
}
