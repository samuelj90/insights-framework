import { extent, format, line, max, scaleLinear, select } from 'd3';

export type BarData = { readonly label: string; readonly value: number };
export type LineData = { readonly label: string; readonly color: string; readonly values: readonly number[] };

export type ChartSpec =
  | { kind: 'bar'; title: string; unit: string; data: readonly BarData[] }
  | { kind: 'line'; title: string; axis: readonly [string, string, string]; data: readonly LineData[] };

function validate(spec: ChartSpec) {
  if (!spec.title.trim() || spec.data.length === 0) throw new RangeError('A chart needs a title and data.');
  if (spec.kind === 'bar') {
    if (spec.data.some(({ label, value }) => !label.trim() || !Number.isFinite(value) || value < 0)) {
      throw new RangeError('Bars require labels and finite non-negative values.');
    }
  } else {
    const length = spec.data[0]?.values.length ?? 0;
    if (length < 2 || spec.data.some(({ label, values }) =>
      !label.trim() || values.length !== length || !values.every(Number.isFinite))) {
      throw new RangeError('Line panels require labels and equally sized finite series with at least two points.');
    }
  }
}

export function createChart(element: HTMLElement, initial: ChartSpec) {
  function updateData(spec: ChartSpec) {
    validate(spec);
    element.replaceChildren();
    const root = select(element);
    const chart = root.append('svg').attr('role', 'img').attr('aria-label', spec.title)
      .attr('width', '100%').style('display', 'block');
    if (spec.kind === 'bar') {
      const width = 640;
      const labelWidth = 168;
      const height = spec.data.length * 30 + 8;
      const scale = scaleLinear([0, max(spec.data, (d) => d.value) || 1], [0, width - labelWidth - 64]);
      chart.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
      const colors = ['#7fb0d2', '#5286ac', '#3b6180', '#2a4356', '#1e2b36'];
      const rows = chart.selectAll('g').data(spec.data).join('g')
        .attr('transform', (_, i) => `translate(0,${i * 30})`);
      rows.append('title').text((d) => `${d.label}: ${format(',')(d.value)}`);
      rows.append('text').attr('y', 18).attr('fill', 'currentColor').attr('font-size', 13).text((d) => d.label);
      rows.append('rect').attr('x', labelWidth).attr('y', 6).attr('height', 16).attr('rx', 1)
        .attr('width', (d) => scale(d.value)).attr('fill', (_, i) => colors[Math.min(i, colors.length - 1)] ?? 'currentColor');
      rows.append('text').attr('x', (d) => labelWidth + scale(d.value) + 8).attr('y', 18)
        .attr('fill', 'currentColor').attr('font-size', 13).attr('font-family', 'monospace')
        .text((d) => format(',')(d.value));
      root.append('div').attr('class', 'chart-unit').text(spec.unit);
    } else {
      const width = 1000;
      const panelHeight = 92;
      const panelStep = panelHeight + 28;
      const height = spec.data.length * panelStep - 10;
      chart.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height + 10)
        .attr('preserveAspectRatio', 'none');
      const x = scaleLinear([0, (spec.data[0]?.values.length ?? 2) - 1], [0, width]);
      spec.data.forEach(({ label, values, color }, i) => {
        const [low = 0, high = 1] = extent(values);
        const y = scaleLinear([low, low === high ? low + 1 : high], [panelHeight, 0]);
        const panel = chart.append('g').attr('transform', `translate(0,${panelStep * i})`);
        panel.append('title').text(label);
        for (const rule of [0, panelHeight / 2, panelHeight]) {
          panel.append('line').attr('y1', rule).attr('y2', rule).attr('x2', width)
            .attr('stroke', 'var(--rule, #68716e)');
        }
        panel.append('path').attr('d', line<number>().x((_, j) => x(j)).y((d) => y(d))(values))
          .attr('stroke', color).attr('stroke-width', 1.75).attr('vector-effect', 'non-scaling-stroke').attr('fill', 'none');
      });
      root.append('div').attr('class', 'chart-axis').selectAll('span').data(spec.axis).join('span').text((d) => d);
    }
  }

  updateData(initial);
  return { updateData, destroy: () => element.replaceChildren() };
}
