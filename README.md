# Insights Framework

A framework-neutral TypeScript canvas library (ECharts and D3) with a small React demo. The
demo implements the Insights Canvas prototype against synthetic data; it does not
call the Insights API or save board changes.

```shell
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

`npm run build` emits the ESM library and TypeScript declarations in `dist` and
the static demo in `demo/dist`. The browser tests can use an installed Edge
browser by setting `PLAYWRIGHT_CHANNEL=msedge`. Set `INSIGHT_PROTOTYPE` to the
absolute path to `insight-canvas-prototype.html` to enable the optional desktop
comparison and capture both views.

In the demo, switch between Board and Thread without losing Board changes. On a
wide Board, use the move and resize handles with the pointer or focus them and
use the arrow keys. Placements snap to the grid; overlaps and out-of-bounds
edits leave the last committed placement intact. A narrow Board stacks cards
without changing their desktop positions. Reload restores the fixtures. Use a
recent question in the composer to see a sample result, or open a card's
inspector to see its fixture reasoning, contract, and SQL when available.

## Current library API

### Visual kinds (v2)

`KIND_RULES` is the single source of truth for what each kind accepts. Hosts
validate an AI-proposed query plan against it before running a query, and
`knowledge/visualization-v2.json` describes the same rules to an AI host.
"Groups" counts categorical dimensions plus the time dimension; "additive"
kinds need counts or sums, because they show parts of a whole.

| Kind | Use | Metrics | Groups | Time | Additive |
| --- | --- | --- | --- | --- | --- |
| `kpi` | One headline number | 1 | 0 | no | |
| `bar` / `column` | Compare or rank categories | 1 | 1 | no | |
| `donut` | Share across six or fewer categories | 1 | 1 | no | yes |
| `treemap` | Share across many categories | 1 | 1 | no | yes |
| `funnel` | Drop-off across stages | 1 | 1 | no | yes |
| `line` | Trend over time | 1–3 | 1–2 | required | |
| `area` | Volume over time | 1 | 1 | required | yes |
| `stacked_bar` | Composition across two groupings | 1 | 2 | optional | yes |
| `grouped_bar` | Side-by-side measures per category | 1–3 | 1–2 | no | |
| `heatmap` | Intensity across two groupings | 1 | 2 | optional | |
| `scatter` | Relationship between two measures | 2 | 1 | no | |
| `sankey` | Flow from one grouping to another | 1 | 2 | no | yes |
| `table` | Exact values and detail | 0–6 | 0–4 | optional | |

### Display contract

Every v2 payload has `version: '2'`, `kind`, `title` and `unit`, plus the data
for its shape:

- `kpi`: `value`
- `bar`, `column`, `donut`, `treemap`, `funnel`: `data: [{ label, value }]`
- `line`, `area`, `stacked_bar`, `grouped_bar`: `categories` and
  `series: [{ name, values }]`, with one value (or `null`) per category
- `heatmap`: `x`, `y` and `cells: [{ x, y, value }]`
- `scatter`: `axes: { x, y }` and `points: [{ label, x, y }]`
- `sankey`: `links: [{ source, target, value }]`
- `table`: `columns` and `rows`, where cells are string, number or `null`

`parseVisualizationContract` validates a payload at runtime and still accepts
v1 bar and donut payloads. `renderVisualization(element, payload, { theme })`
validates and renders it, and returns `{ destroy() }`. The host owns AI,
privacy, fetching, and binding authorized data; the library never fetches.

### Rendering

Charts render with [Apache ECharts](https://echarts.apache.org) through its
tree-shaken core and SVG renderer, with the aria component enabled. Charts
resize with their container. `toEChartsOption(contract, theme)` is exported for
hosts that manage their own ECharts instance. ECharts was chosen because one
dependency covers every kind above, including heatmap, Sankey, treemap and
funnel, and its option objects are plain data that map directly from a
contract. Alternatives considered:

- Vega-Lite: a declarative grammar, but Sankey is not built in and the runtime
  is heavier.
- Observable Plot: a small library, but it has no Sankey, funnel or treemap and
  no interactive tooltips by default.
- Plotly: covers the kinds, but the bundle is several times larger.
- Chart.js, Nivo and Recharts: need plugins for the matrix and flow kinds, and
  Nivo and Recharts are React-only.

`theme` is a partial `VisualTheme` (`text`, `muted`, `grid`, `surface`,
`palette`) merged over `DEFAULT_THEME`; pass colours read from your CSS
variables and re-render when the theme changes. KPIs and tables render as
plain DOM with no styles of their own. Style them through `data-part`
attributes: `kpi`, `kpi-label`, `kpi-value`, `kpi-unit`, `table-scroll`,
`table`, `table-head` and `table-cell`. Numeric table cells also carry
`data-numeric`.

### Dashboard layout

`layoutDashboard(tiles, columns = 12)` packs `{ id, kind, content }` tiles into
a gap-free 12-column grid in reading order: KPIs share the first rows evenly,
then charts at each kind's default size, then tables. The last tile in each row
widens to fill it. It returns the same `GridResult` as `GridContainer.create`.
- `GridContainer.create({ columns, items })` and `Schema.create(...)` validate
  an initial layout. Use `addItem`, `updateItem`, and `removeItem` on the returned
  grid to obtain a new grid or an explicit failure reason. Widget content is
  caller-owned. A placement has zero-based `x`, `y` and positive `w`, `h`.
- `createChart(element, spec)` is the original D3 SVG renderer for a horizontal
  bar chart or line panels with a shared x-axis, and still renders v1 bar
  contracts. The returned object supports `updateData(spec)` and `destroy()`.
- Pointer and keyboard bindings live in the example app. The upstream DOM
  selector API, a public plugin interface, and npm publication are not part of
  this milestone.

## Migration boundary

The existing Insights Platform remains the source of truth for live queries.
The next step is a demo-app adapter for the existing Canvas answer contract,
including visualization coverage and inspection metadata, without moving the
Python backend. Compare the two Canvas implementations before cutover, and
decide how to transfer any browser-local reports separately from backend
reports. Export, sharing, and live refresh are intentionally unavailable in the
fixture demo.

## Original Visual Stack design

This file was modified for Insights Framework. The upstream design is retained
below for reference; its package-installation and API examples are proposals,
not instructions for this fork.

### Visual Stack - A Flexible Grid and Visualization Library

`Visual Stack` is a lightweight, modular JavaScript library that combines dynamic grid layouts with data visualizations. Powered by **VisualStack.js** for grid management and **D3.js** for rendering charts, `Visual Stack` allows you to create interactive and customizable dashboards with ease.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
    - [Basic Example](#basic-example)
    - [Schema Example](#schema-example)
    - [Customizing Grid Items](#customizing-grid-items)
- [API](#api)
    - [VisualStack API](#VisualStack-api)
    - [Visualization API](#visualization-api)
    - [Schema API](#schema-api)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Dynamic Grid Layouts**: Drag-and-drop and resize grid items with support for a flexible, responsive grid.
- **Data Visualizations**: Built-in chart types like bar charts, line charts, and pie charts powered by D3.js.
- **Schema-Driven Rendering**: Easily configure grid items and visualizations via a simple schema object.
- **Customizable**: Fully customizable grid layout, visualization styles, and chart settings.
- **Lightweight & Modular**: Minimal dependencies (VisualStack.js and D3.js) and small bundle size.
- **No External Fetching Libraries**: Data handling is manual, so you can integrate your own data fetching logic.

---

## Installation

To get started with `visual-stack`, you can install it via **npm** or **yarn**:

```bash
npm install visual-stack
# or
yarn add visual-stack
```

Once installed, you can import the library into your project:

```js
import VisualStack from 'visual-stack';
```

---

## Usage

### Basic Example

Here’s how to create a simple grid with a bar chart visualization:

```html
<div id="grid-container"></div>

<script type="module">
    import VisualStack from 'visual-stack';

    const grid = new VisualStack.GridContainer('#grid-container');

    // Add a grid item with a bar chart
    grid.addItem('chart-1', {
        type: 'bar-chart',
        data: [
            { label: 'A', value: 30 },
            { label: 'B', value: 80 },
            { label: 'C', value: 45 },
        ],
        width: 4,
        height: 4,
        config: {
            title: 'Sample Bar Chart',
            color: '#4caf50',
        }
    });
</script>
```

### Schema Example

With Visual Stack, you can use a schema to define your grid items and visualizations:

```js
const schema = [
    {
        id: 'chart-1',
        type: 'bar-chart',
        data: [
            { label: 'A', value: 40 },
            { label: 'B', value: 55 },
            { label: 'C', value: 30 },
        ],
        config: {
            title: 'Revenue by Product',
            color: '#ff5722',
        },
    },
    {
        id: 'chart-2',
        type: 'pie-chart',
        data: [
            { label: 'Product A', value: 35 },
            { label: 'Product B', value: 65 },
        ],
        config: {
            title: 'Market Share',
        },
    }
];

// Initialize and render grid items based on schema
const grid = new Visual Stack.GridContainer('#grid-container');
schema.forEach(item => {
    grid.addItem(item.id, item);
});
```

### Customizing Grid Items

You can customize grid items with options such as size, position, and other chart properties. For example:

```js
grid.addItem('custom-chart', {
    type: 'line-chart',
    data: [...],
    width: 6,
    height: 6,
    config: {
        title: 'Sales Growth',
        color: '#1976d2',
        axis: { x: 'Month', y: 'Revenue' }
    }
});
```

---

## API

### VisualStack API

- **GridContainer**: Initializes the grid container.

    ```js
    const grid = new VisualStack.GridContainer(selector, options);
    ```

- **addItem(itemId, config)**: Adds a new grid item to the container.

    ```js
    grid.addItem(itemId, config);
    ```

- **removeItem(itemId)**: Removes a grid item by its ID.

    ```js
    grid.removeItem(itemId);
    ```

- **updateItem(itemId, config)**: Updates the grid item configuration.

    ```js
    grid.updateItem(itemId, config);
    ```

### Visualization API

- **create(type, data, config)**: Creates a new chart of the specified type.

    ```js
    const chart = VisualStack.create('bar-chart', data, config);
    ```

    Supported Chart Types:
    - `'bar-chart'`
    - `'line-chart'`
    - `'pie-chart'`

- **updateData(data)**: Updates the data for an existing chart.

    ```js
    chart.updateData(newData);
    ```

### Schema API

- **create(config)**: Generates grid items and visualizations based on the provided schema.

    ```js
    VisualStack.Schema.create(config);
    ```

- **updateItem(itemId, data)**: Updates data for a specific grid item.

    ```js
    VisualStack.Schema.updateItem(itemId, newData);
    ```

---

## Contributing

We welcome contributions to improve Visual Stack. Here’s how you can get involved:

1. Fork the repository.
2. Clone the repository to your local machine.
3. Create a branch for your feature/bugfix.
4. Make your changes and commit them with a meaningful message.
5. Push your changes to your fork.
6. Create a pull request to merge your changes.

---

## License

Visual Stack is licensed under the Appache Liscence.

---

## Contact

If you have any questions or need help, feel free to open an issue or contact the maintainers.