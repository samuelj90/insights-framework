import type { ChartSpec, GridItem, Placement } from '../../src/index.js';

type WidgetBody =
  | { kind: 'kpi'; value: string; delta: string; negative?: boolean; alert?: boolean }
  | { kind: 'table'; rows: readonly (readonly [string, string, string])[] }
  | { kind: 'chart'; spec: ChartSpec; legend?: boolean };

export type Widget = WidgetBody & {
  title: string;
  provenance: readonly string[];
  reasoning: string;
  sql?: string;
};

function item(id: string, layout: Placement, content: Widget): GridItem<Widget> {
  return { id, layout, content };
}

let seed = 7;
const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const revenue = Array.from({ length: 90 }, (_, i) => 44 + i * .09 + Math.sin(i / 4) * 3.2 + random() * 3);
const load = Array.from({ length: 90 }, (_, i) =>
  82.5 - Math.max(0, i - 58) * .11 + Math.sin(i / 6) * 1.4 + random() * 1.1);

export const title = 'Network revenue & route risk';
export const sampleItems = [
  item('revenue', { x: 0, y: 0, w: 3, h: 1 }, {
    kind: 'kpi', title: 'Network revenue', value: 'USD 4.21bn', delta: '+6.2% vs Q2 FY25',
    provenance: ['fct_bookings', '06:12'], reasoning: 'Compares synthetic flown revenue with the previous fiscal year.',
  }),
  item('load', { x: 3, y: 0, w: 3, h: 1 }, {
    kind: 'kpi', title: 'Seat load factor', value: '81.4%', delta: '+1.1 pts',
    provenance: ['fct_capacity', '06:12'], reasoning: 'Uses the ratio of occupied seats to available seats.',
  }),
  item('yield', { x: 6, y: 0, w: 3, h: 1 }, {
    kind: 'kpi', title: 'Yield per ASK', value: 'USD 0.312', delta: '−2.4%', negative: true,
    provenance: ['derived', '06:12'], reasoning: 'Divides fixture revenue by available seat kilometres.',
  }),
  item('below-break-even', { x: 9, y: 0, w: 3, h: 1 }, {
    kind: 'kpi', title: 'Routes below break-even', value: '3', delta: 'of 214 scheduled', alert: true,
    provenance: ['allocated model', 'unverified'], reasoning: 'Uses an unverified cost allocation; this count is directional.',
  }),
  item('regions', { x: 0, y: 1, w: 7, h: 1 }, {
    kind: 'chart', title: 'Revenue by region',
    spec: { kind: 'bar', title: 'Revenue by region, horizontal bar chart', unit: 'USD millions · Q2 FY26', data: [
      { label: 'Europe', value: 1240 }, { label: 'Far East & Australasia', value: 1080 },
      { label: 'Americas', value: 720 }, { label: 'West Asia & Indian Ocean', value: 610 },
      { label: 'Africa', value: 340 }, { label: 'Gulf & Middle East', value: 220 },
    ] },
    provenance: ['6 rows', 'fct_bookings, dim_route', 'through 24 Jul 06:00 UTC', '0.9s'],
    reasoning: 'Horizontal bars make six ranked regions easy to compare.',
    sql: `SELECT region_name, SUM(revenue_usd) / 1e6 AS revenue_m
FROM sample_bookings
WHERE fare_basis_group <> 'STAFF'
GROUP BY region_name
ORDER BY revenue_m DESC;`,
  }),
  item('routes', { x: 7, y: 1, w: 5, h: 1 }, {
    kind: 'table', title: 'Routes below break-even',
    rows: [
      ['Route A', '62.1%', '−3.2%'], ['Route B', '64.8%', '−1.9%'],
      ['Route C', '66.0%', '−0.8%'], ['Route D', '71.2%', '+0.4%'], ['Route E', '73.5%', '+1.2%'],
    ],
    provenance: ['5 of 214', 'allocated cost model', 'owner sign-off pending'],
    reasoning: 'Route profitability is based on a sample allocation model without owner sign-off.',
  }),
  item('trend', { x: 0, y: 2, w: 12, h: 1 }, {
    kind: 'chart', title: 'Revenue and load factor, last 90 days', legend: true,
    spec: { kind: 'line', title: 'Revenue and load factor over 90 days, two panels',
      axis: ['Apr 24', 'Jun 7', 'Jul 22'], data: [
        { label: 'Revenue', color: '#6fa3cf', values: revenue },
        { label: 'Load factor', color: '#93b369', values: load },
      ] },
    provenance: ['90 rows', 'fct_bookings, fct_capacity', 'through 24 Jul 06:00 UTC', '1.6s'],
    reasoning: 'Separate panels share the date axis without implying a correlation on two y-scales.',
  }),
];

export const recent = [
  { time: '06:12', question: 'Revenue by region for Q2, excluding staff bookings', count: '6 rows', id: 'regions' },
  { time: '05:58', question: 'Load factor by route, last 90 days', count: '90 rows', id: 'trend' },
  { time: 'Tue', question: 'Which of the three loss-making routes lost the most in the last five weeks?', count: '5 rows', id: 'routes' },
] as const;
