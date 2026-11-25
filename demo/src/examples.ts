import type { VisualizationContract, VisualKind } from '../../src/index.js';

export const examples: Record<VisualKind, VisualizationContract> = {
  kpi: { kind: 'kpi', title: 'Payment intents', unit: 'payments', value: 1800 },
  bar: { kind: 'bar', title: 'Revenue by region', unit: 'USD m', data: [
    { label: 'EMEA', value: 12.4 }, { label: 'APAC', value: 18.7 }, { label: 'Americas', value: 15.2 },
  ] },
  column: { kind: 'column', title: 'Payments by method', unit: 'payments', data: [
    { label: 'Card', value: 1168 }, { label: 'Wallet', value: 377 }, { label: 'Bank', value: 188 },
  ] },
  donut: { kind: 'donut', title: 'Processor mix', unit: 'attempts', data: [
    { label: 'processor_a', value: 768 }, { label: 'processor_b', value: 606 }, { label: 'processor_c', value: 398 },
  ] },
  treemap: { kind: 'treemap', title: 'Failure share', unit: 'attempts', data: [
    { label: 'Declined', value: 88 }, { label: 'Timeout', value: 54 }, { label: 'Insufficient funds', value: 44 },
  ] },
  funnel: { kind: 'funnel', title: 'Checkout funnel', unit: 'sessions', data: [
    { label: 'Started', value: 1000 }, { label: 'Method selected', value: 820 }, { label: 'Succeeded', value: 704 },
  ] },
  line: { kind: 'line', title: 'Payment success trend', unit: '%', categories: ['Jan', 'Feb', 'Mar', 'Apr'],
    series: [{ name: 'Success rate', values: [82, 84, 83, 87] }] },
  area: { kind: 'area', title: 'Payment volume', unit: 'payments', categories: ['Jan', 'Feb', 'Mar', 'Apr'],
    series: [{ name: 'Payments', values: [410, 438, 501, 487] }] },
  stacked_bar: { kind: 'stacked_bar', title: 'Attempts by processor', unit: 'attempts',
    categories: ['processor_a', 'processor_b', 'processor_c'], series: [
      { name: 'Success', values: [680, 535, 300] }, { name: 'Failure', values: [88, 71, 98] },
    ] },
  grouped_bar: { kind: 'grouped_bar', title: 'Payments by quarter', unit: 'payments', categories: ['Q1', 'Q2'],
    series: [{ name: '2025', values: [720, 760] }, { name: '2026', values: [810, 905] }] },
  heatmap: { kind: 'heatmap', title: 'Failure rate matrix', unit: '%', x: ['processor_a', 'processor_b', 'processor_c'],
    y: ['card', 'wallet'], cells: [
      { x: 'processor_a', y: 'card', value: 8 }, { x: 'processor_b', y: 'card', value: 10 },
      { x: 'processor_c', y: 'card', value: 14 }, { x: 'processor_a', y: 'wallet', value: 4 },
      { x: 'processor_b', y: 'wallet', value: 5 }, { x: 'processor_c', y: 'wallet', value: 7 },
    ] },
  scatter: { kind: 'scatter', title: 'Latency and success', unit: 'attempts',
    axes: { x: 'Latency ms', y: 'Success %' }, points: [
      { label: 'processor_a', x: 180, y: 88 }, { label: 'processor_b', x: 220, y: 86 },
      { label: 'processor_c', x: 390, y: 74 },
    ] },
  sankey: { kind: 'sankey', title: 'Attempt flow', unit: 'attempts', links: [
    { source: 'Card', target: 'Charged', value: 930 }, { source: 'Card', target: 'Failed', value: 238 },
    { source: 'Wallet', target: 'Charged', value: 340 }, { source: 'Wallet', target: 'Failed', value: 37 },
  ] },
  table: { kind: 'table', title: 'Processor summary', unit: '', columns: ['Processor', 'Attempts', 'Success %'],
    rows: [['processor_a', 768, 88.5], ['processor_b', 606, 88.3], ['processor_c', 398, 75.4]] },
};
