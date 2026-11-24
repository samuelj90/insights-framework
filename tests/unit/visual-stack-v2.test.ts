import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KIND_RULES, layoutDashboard, parseVisualizationContract, toEChartsOption, VISUAL_KINDS } from '../../src/index.js';
import type { VisualizationContractV2, VisualKind } from '../../src/index.js';

const base = { version: '2', title: 'T', unit: 'u' } as const;
const samples: Record<Exclude<VisualKind, 'kpi' | 'table'>, VisualizationContractV2> = {
  bar: { ...base, kind: 'bar', data: [{ label: 'a', value: -1 }] },
  column: { ...base, kind: 'column', data: [{ label: 'a', value: 1 }] },
  donut: { ...base, kind: 'donut', data: [{ label: 'a', value: 1 }] },
  treemap: { ...base, kind: 'treemap', data: [{ label: 'a', value: 1 }] },
  funnel: { ...base, kind: 'funnel', data: [{ label: 'a', value: 2 }, { label: 'b', value: 1 }] },
  line: { ...base, kind: 'line', categories: ['Jan', 'Feb'], series: [{ name: 's', values: [1, null] }] },
  area: { ...base, kind: 'area', categories: ['Jan', 'Feb'], series: [{ name: 's', values: [1, 2] }] },
  stacked_bar: { ...base, kind: 'stacked_bar', categories: ['a'], series: [{ name: 'x', values: [1] }, { name: 'y', values: [2] }] },
  grouped_bar: { ...base, kind: 'grouped_bar', categories: ['a'], series: [{ name: 'x', values: [-1] }] },
  heatmap: { ...base, kind: 'heatmap', x: ['a', 'b'], y: ['p'], cells: [{ x: 'a', y: 'p', value: 3 }] },
  scatter: { ...base, kind: 'scatter', axes: { x: 'count', y: 'avg' }, points: [{ label: 'a', x: 1, y: 2 }] },
  sankey: { ...base, kind: 'sankey', links: [{ source: 'a', target: 'b', value: 1 }] },
};

describe('version 2 contracts', () => {
  it('accepts every chart kind and builds an ECharts option for it', () => {
    for (const contract of Object.values(samples)) {
      expect(parseVisualizationContract(contract)).toEqual(contract);
      const option = toEChartsOption(contract) as { series: unknown[] };
      expect(option.series.length).toBeGreaterThan(0);
    }
  });

  it('accepts KPI and table contracts, which render as HTML', () => {
    const kpi = { ...base, kind: 'kpi', value: -2.5 };
    const table = { ...base, kind: 'table', columns: ['a', 'b'], rows: [['x', 1], [null, 2]] };
    expect(parseVisualizationContract(kpi)).toEqual(kpi);
    expect(parseVisualizationContract(table)).toEqual(table);
    expect(() => toEChartsOption(parseVisualizationContract(kpi) as VisualizationContractV2)).toThrow(RangeError);
  });

  it('rejects contracts that would misrepresent the data', () => {
    for (const invalid of [
      { ...samples.donut, data: [{ label: 'a', value: -1 }] },
      { ...samples.treemap, data: [{ label: 'a', value: 0 }] },
      { ...samples.line, series: [{ name: 's', values: [1] }] },
      { ...samples.stacked_bar, series: [{ name: 'x', values: [-1] }] },
      { ...samples.line, categories: ['Jan', 'Jan'] },
      { ...samples.heatmap, cells: [{ x: 'z', y: 'p', value: 1 }] },
      { ...samples.heatmap, cells: [{ x: 'a', y: 'p', value: 1 }, { x: 'a', y: 'p', value: 2 }] },
      { ...samples.sankey, links: [{ source: 'a', target: 'b', value: 1 }, { source: 'b', target: 'a', value: 1 }] },
      { ...samples.sankey, links: [{ source: 'a', target: 'a', value: 1 }] },
      { ...base, kind: 'table', columns: ['a'], rows: [['x', 1]] },
      { ...base, kind: 'kpi', value: Infinity },
      { ...base, kind: 'kpi', value: 1, data: [] },
      { ...base, kind: 'radar', data: [] },
    ]) expect(() => parseVisualizationContract(invalid), JSON.stringify(invalid)).toThrow(TypeError);
  });
});

it('publishes knowledge that matches the kind rules', () => {
  const knowledge = JSON.parse(readFileSync(new URL('../../knowledge/visualization-v2.json', import.meta.url), 'utf8'));
  expect(knowledge.version).toBe('2');
  expect(knowledge.kinds).toEqual(JSON.parse(JSON.stringify(KIND_RULES)));
  expect(Object.keys(knowledge.kinds)).toEqual(VISUAL_KINDS);
});

describe('layoutDashboard', () => {
  it('places KPIs in an even band, then fills every chart row without gaps', () => {
    const kinds: VisualKind[] = ['line', 'kpi', 'donut', 'kpi', 'table', 'kpi', 'bar'];
    const result = layoutDashboard(kinds.map((kind, index) => ({ id: `t${index}`, kind, content: kind })));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const layout = Object.fromEntries(result.grid.items.map((item) => [item.id, item.layout]));
    expect([layout.t1, layout.t3, layout.t5]).toEqual([
      { x: 0, y: 0, w: 4, h: 1 }, { x: 4, y: 0, w: 4, h: 1 }, { x: 8, y: 0, w: 4, h: 1 },
    ]);
    expect(layout.t0).toEqual({ x: 0, y: 1, w: 8, h: 2 });
    expect(layout.t2).toEqual({ x: 8, y: 1, w: 4, h: 2 });
    expect(layout.t6).toEqual({ x: 0, y: 3, w: 12, h: 2 });
    expect(layout.t4).toEqual({ x: 0, y: 5, w: 12, h: 2 });
  });
});
