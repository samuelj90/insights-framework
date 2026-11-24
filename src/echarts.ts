import type { EChartsCoreOption } from 'echarts/core';
import type { VisualizationContractV2 } from './contract-schema.js';

export interface VisualTheme {
  readonly text: string;
  readonly muted: string;
  readonly grid: string;
  readonly surface: string;
  readonly palette: readonly string[];
}

export const DEFAULT_THEME: VisualTheme = {
  text: '#e6e9e8',
  muted: '#9aa3a0',
  grid: '#2c3331',
  surface: '#171b1a',
  palette: ['#6fa3cf', '#d99460', '#93b369', '#b084ac', '#6fbdbd', '#c29f5f', '#d97b7b', '#8c96d9'],
};

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const formatValue = (value: number) => full.format(value);
const axisValue = (value: number) => compact.format(value);

function axes(theme: VisualTheme) {
  const line = { lineStyle: { color: theme.grid } };
  return {
    category: { axisLine: line, axisTick: { show: false }, axisLabel: { color: theme.muted, hideOverlap: true } },
    value: { axisLine: { show: false }, splitLine: line, axisLabel: { color: theme.muted, formatter: axisValue } },
  };
}

export function toEChartsOption(contract: VisualizationContractV2, theme: VisualTheme = DEFAULT_THEME): EChartsCoreOption {
  const { category, value } = axes(theme);
  const base = {
    animationDuration: 300,
    aria: { enabled: true, label: { description: contract.title } },
    color: [...theme.palette],
    textStyle: { color: theme.text, fontFamily: 'inherit' },
    tooltip: {
      confine: true,
      backgroundColor: theme.surface,
      borderColor: theme.grid,
      textStyle: { color: theme.text },
      valueFormatter: (item: unknown) => typeof item === 'number' ? `${formatValue(item)} ${contract.unit}`.trim() : String(item ?? '—'),
    },
  };
  const grid = { left: 8, right: 16, top: 16, bottom: 8, containLabel: true };
  const legend = { type: 'scroll', bottom: 0, textStyle: { color: theme.muted }, pageTextStyle: { color: theme.muted } };

  switch (contract.kind) {
    case 'kpi': case 'table':
      throw new RangeError(`${contract.kind} is rendered as HTML, not as an ECharts option.`);
    case 'bar':
      return { ...base, grid, tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'value', ...value },
        yAxis: { type: 'category', inverse: true, data: contract.data.map((d) => d.label), ...category },
        series: [{ type: 'bar', name: contract.unit, data: contract.data.map((d) => d.value), barMaxWidth: 22,
          label: { show: contract.data.length <= 12, position: 'right', color: theme.muted, formatter: ({ value: v }: { value: number }) => axisValue(v) } }] };
    case 'column':
      return { ...base, grid, tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category', data: contract.data.map((d) => d.label), ...category },
        yAxis: { type: 'value', ...value },
        series: [{ type: 'bar', name: contract.unit, data: contract.data.map((d) => d.value), barMaxWidth: 36 }] };
    case 'donut':
      return { ...base, tooltip: { ...base.tooltip, trigger: 'item' }, legend,
        series: [{ type: 'pie', name: contract.title, radius: ['48%', '72%'], center: ['50%', '45%'],
          itemStyle: { borderColor: theme.surface, borderWidth: 2 },
          label: { color: theme.muted, formatter: '{d}%' },
          data: contract.data.map((d) => ({ name: d.label, value: d.value })) }] };
    case 'treemap':
      return { ...base, tooltip: { ...base.tooltip, trigger: 'item' },
        series: [{ type: 'treemap', name: contract.title, roam: false, nodeClick: false, breadcrumb: { show: false },
          top: 4, left: 4, right: 4, bottom: 4, colorMappingBy: 'index',
          itemStyle: { borderColor: theme.surface, borderWidth: 2, gapWidth: 2 },
          label: { color: '#0f1312', formatter: '{b}' },
          data: contract.data.map((d) => ({ name: d.label, value: d.value })) }] };
    case 'funnel':
      return { ...base, tooltip: { ...base.tooltip, trigger: 'item' }, legend,
        series: [{ type: 'funnel', name: contract.title, sort: 'none', gap: 2, top: 8, bottom: 32, left: '10%', width: '80%',
          itemStyle: { borderColor: theme.surface }, label: { color: theme.text, formatter: '{b}' },
          data: contract.data.map((d) => ({ name: d.label, value: d.value })) }] };
    case 'line': case 'area': case 'stacked_bar': case 'grouped_bar': {
      const isLine = contract.kind === 'line' || contract.kind === 'area';
      const showLegend = contract.series.length > 1;
      return { ...base, grid: { ...grid, bottom: showLegend ? 32 : 8 },
        tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: isLine ? 'line' : 'shadow' } },
        ...(showLegend ? { legend } : {}),
        xAxis: { type: 'category', boundaryGap: !isLine, data: [...contract.categories], ...category },
        yAxis: { type: 'value', ...value },
        series: contract.series.map((s) => ({
          type: isLine ? 'line' : 'bar', name: s.name, data: [...s.values],
          ...(isLine ? { showSymbol: contract.categories.length <= 24, smooth: false, connectNulls: false } : { barMaxWidth: 28 }),
          ...(contract.kind === 'area' ? { areaStyle: { opacity: 0.25 } } : {}),
          ...(contract.kind === 'stacked_bar' ? { stack: 'total' } : {}),
        })) };
    }
    case 'heatmap': {
      const values = contract.cells.map((c) => c.value);
      return { ...base, grid: { ...grid, bottom: 40 }, tooltip: { ...base.tooltip, trigger: 'item' },
        xAxis: { type: 'category', data: [...contract.x], ...category, splitArea: { show: false } },
        yAxis: { type: 'category', data: [...contract.y], ...category },
        visualMap: { min: Math.min(...values), max: Math.max(...values), calculable: false, orient: 'horizontal',
          left: 'center', bottom: 0, itemHeight: 120, textStyle: { color: theme.muted },
          inRange: { color: [theme.grid, theme.palette[0] ?? '#6fa3cf'] } },
        series: [{ type: 'heatmap', name: contract.title,
          data: contract.cells.map((c) => [contract.x.indexOf(c.x), contract.y.indexOf(c.y), c.value]),
          label: { show: contract.cells.length <= 60, color: theme.text, formatter: ({ value: v }: { value: number[] }) => axisValue(v[2] ?? 0) },
          itemStyle: { borderColor: theme.surface, borderWidth: 1 } }] };
    }
    case 'scatter':
      return { ...base, grid: { ...grid, left: 24, bottom: 24 }, tooltip: { ...base.tooltip, trigger: 'item',
          formatter: ({ data }: { data: [number, number, string] }) =>
            `${data[2]}<br/>${contract.axes.x}: ${formatValue(data[0])}<br/>${contract.axes.y}: ${formatValue(data[1])}` },
        xAxis: { type: 'value', name: contract.axes.x, nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: theme.muted }, ...value },
        yAxis: { type: 'value', name: contract.axes.y, nameTextStyle: { color: theme.muted }, ...value },
        series: [{ type: 'scatter', name: contract.title, symbolSize: 12,
          data: contract.points.map((p) => [p.x, p.y, p.label]),
          label: { show: contract.points.length <= 12, position: 'top', color: theme.muted, formatter: ({ data }: { data: [number, number, string] }) => data[2] } }] };
    case 'sankey': {
      const nodes = [...new Set(contract.links.flatMap((l) => [l.source, l.target]))].map((name) => ({ name }));
      return { ...base, tooltip: { ...base.tooltip, trigger: 'item' },
        series: [{ type: 'sankey', name: contract.title, left: 8, right: 96, top: 8, bottom: 8, nodeGap: 10,
          emphasis: { focus: 'adjacency' }, label: { color: theme.text },
          lineStyle: { color: 'gradient', opacity: 0.35 }, data: nodes, links: contract.links.map((l) => ({ ...l })) }] };
    }
  }
}
