export type VisualKind =
  | 'kpi' | 'bar' | 'column' | 'donut' | 'treemap' | 'funnel'
  | 'line' | 'area' | 'stacked_bar' | 'grouped_bar'
  | 'heatmap' | 'scatter' | 'sankey' | 'table';

export type VisualFamily = 'single' | 'category' | 'series' | 'matrix' | 'points' | 'flow' | 'table';

export interface KindRule {
  readonly family: VisualFamily;
  readonly use: string;
  /** Inclusive [min, max] number of metrics in the query plan. */
  readonly metrics: readonly [number, number];
  /** Inclusive [min, max] number of groupings: categorical dimensions plus the time dimension. */
  readonly groups: readonly [number, number];
  readonly time: 'required' | 'optional' | 'forbidden';
  /** Values are summed or shown as parts of a whole, so metrics must be counts or sums. */
  readonly additive: boolean;
  /** Default tile footprint on a 12-column dashboard grid. */
  readonly size: { readonly w: number; readonly h: number };
}

export const KIND_RULES: Readonly<Record<VisualKind, KindRule>> = {
  kpi: { family: 'single', use: 'A single headline number, such as a total count or sum.',
    metrics: [1, 1], groups: [0, 0], time: 'forbidden', additive: false, size: { w: 3, h: 1 } },
  bar: { family: 'category', use: 'Rank or compare categories, especially many or long labels.',
    metrics: [1, 1], groups: [1, 1], time: 'forbidden', additive: false, size: { w: 6, h: 2 } },
  column: { family: 'category', use: 'Compare a few categories with short labels.',
    metrics: [1, 1], groups: [1, 1], time: 'forbidden', additive: false, size: { w: 6, h: 2 } },
  donut: { family: 'category', use: 'Part-to-whole share across at most six categories.',
    metrics: [1, 1], groups: [1, 1], time: 'forbidden', additive: true, size: { w: 4, h: 2 } },
  treemap: { family: 'category', use: 'Part-to-whole share across many categories.',
    metrics: [1, 1], groups: [1, 1], time: 'forbidden', additive: true, size: { w: 6, h: 2 } },
  funnel: { family: 'category', use: 'Drop-off across ordered stages or outcomes.',
    metrics: [1, 1], groups: [1, 1], time: 'forbidden', additive: true, size: { w: 4, h: 2 } },
  line: { family: 'series', use: 'Trend over time for up to three measures, or one measure split by one category.',
    metrics: [1, 3], groups: [1, 2], time: 'required', additive: false, size: { w: 8, h: 2 } },
  area: { family: 'series', use: 'Volume of one additive measure over time.',
    metrics: [1, 1], groups: [1, 1], time: 'required', additive: true, size: { w: 6, h: 2 } },
  stacked_bar: { family: 'series', use: 'Composition of one additive measure across two groupings, or across a category over time.',
    metrics: [1, 1], groups: [2, 2], time: 'optional', additive: true, size: { w: 6, h: 2 } },
  grouped_bar: { family: 'series', use: 'Side-by-side comparison of two or three measures per category, or one measure across two groupings.',
    metrics: [1, 3], groups: [1, 2], time: 'forbidden', additive: false, size: { w: 6, h: 2 } },
  heatmap: { family: 'matrix', use: 'Intensity of one measure across two groupings, such as processor by error.',
    metrics: [1, 1], groups: [2, 2], time: 'optional', additive: false, size: { w: 6, h: 2 } },
  scatter: { family: 'points', use: 'Relationship between two measures across categories.',
    metrics: [2, 2], groups: [1, 1], time: 'forbidden', additive: false, size: { w: 6, h: 2 } },
  sankey: { family: 'flow', use: 'Flow of an additive measure from one grouping to another.',
    metrics: [1, 1], groups: [2, 2], time: 'forbidden', additive: true, size: { w: 6, h: 2 } },
  table: { family: 'table', use: 'Exact values or detail that a chart would hide.',
    metrics: [0, 6], groups: [0, 4], time: 'optional', additive: false, size: { w: 12, h: 2 } },
};

export const VISUAL_KINDS = Object.keys(KIND_RULES) as VisualKind[];

export function isVisualKind(value: unknown): value is VisualKind {
  return typeof value === 'string' && Object.hasOwn(KIND_RULES, value);
}
