# Visual Stack capability research

## Scope

Visual Stack is a framework-neutral TypeScript presentation library. It owns
contracts, rendering, layout, and update semantics. Hosts remain responsible for
transport, authentication, data access, persistence, and AI.

## Findings from primary sources

### Apache ECharts

ECharts is the best fit for the current renderer because it supports the visual
families already exposed by Visual Stack, including heatmap, Sankey, treemap and
funnel. Its official feature documentation also highlights:

- SVG and Canvas renderers.
- dynamic data through repeated `setOption`.
- incremental and large-scale rendering, including streaming data.
- typed arrays, data zoom, visual maps, brushing, legends and tooltips.
- WAI-ARIA descriptions for accessibility.

The dynamic-data handbook explicitly recommends updating an existing chart with
`setOption` and gives loading-state primitives.

Sources:

- https://echarts.apache.org/en/feature.html
- https://echarts.apache.org/handbook/en/how-to/data/dynamic-data/

### Plotly.js

Plotly's public API documents `Plotly.react` as the efficient update path for an
existing plot and distinguishes it from `newPlot`, which overwrites the chart.
It also provides narrower `restyle` and `relayout` updates. This reinforces a
stable `update` method instead of destroy/recreate loops.

Source:

- https://plotly.com/javascript/plotlyjs-function-reference/#plotlyreact

### Vega

Vega models a view as an instantiated dataflow graph with `run` / `runAsync`
updates and an explicit `finalize()` lifecycle. The view API therefore provides
a useful model for:

- async update completion;
- a deterministic lifecycle;
- headless/server export;
- interaction signals.

Source:

- https://vega.github.io/vega/docs/api/view/

### D3

D3 data joins explicitly model `enter`, `update`, and `exit`, allowing stable
keyed identities when data arrives incrementally. This is relevant to
Visual Stack's low-level D3 renderer and to any future DOM/table streaming.

Source:

- https://d3js.org/d3-selection/joining

## Current Visual Stack capabilities

- 14 visual kinds.
- one unversioned display contract before the first release.
- strict runtime contract validation.
- ECharts SVG rendering and a low-level D3 renderer.
- `renderVisualization` and `update` lifecycle.
- KPI and table rendering as semantic DOM.
- report layout with deterministic 12-column packing.
- Tailwind-only vanilla TypeScript showcase.
- theme tokens, ResizeObserver handling, and cleanup.

## Recommended enhancements

### P0 — safe streaming

1. Add update scheduling options: `throttleMs`, `maxPoints`, and a stable point
   key so hosts can stream without flooding animation/layout work.
2. Support three update modes: `replace`, `append`, and `patch`.
3. Keep `update` synchronous for validated snapshots; add a separate async helper
   for transport streams so networking never enters the rendering library.
4. Define backpressure in terms of host callbacks, not WebSockets or EventSource:
   the host decides transport; Visual Stack only consumes an update stream.
5. Preserve a `destroy` contract and never leave observers, timers or event
   listeners attached.

### P1 — interaction and report behavior

1. Emit normalized selection, hover and zoom events without exposing ECharts
   internals.
2. Export SVG/PNG through an optional adapter; keep it out of the core bundle.
3. Add cross-highlight between report tiles by stable category identity.
4. Add printable report layout and a deterministic snapshot representation.
5. Add optional data zoom and brush contracts.

### P1 — accessibility

1. Emit a concise text summary for each chart through a typed contract field.
2. Provide throttled `aria-live` announcements for streamed changes.
3. Add keyboard navigation for data points and a table alternative.
4. Test contrast and reduced-motion behavior for all themes.

### P2 — scale and rendering

1. Add an opt-in Canvas renderer for very large datasets while keeping SVG as
   the accessible default.
2. Support progressive/incremental option updates and typed arrays.
3. Add sample/downsample policies at the host-to-contract boundary.
4. Keep optional GL and maps outside the core package.

## Boundary decisions

Visual Stack should not add:

- database or API clients;
- authentication or authorization;
- query planning or SQL;
- AI execution;
- application state or saved reports;
- React/Vue/Svelte as a required dependency.

Those concerns belong to the consuming application, preserving the library's
framework-neutral status.
