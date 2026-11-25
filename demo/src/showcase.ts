import {
  KIND_RULES, VISUAL_KINDS, layoutDashboard, parseVisualizationContract, renderVisualization,
} from '../../src/index.js';
import type { RenderedVisualization, VisualKind } from '../../src/index.js';
import { examples } from './examples.js';

type Mode = 'overview' | 'gallery' | 'live' | 'editor';

export function startVisualStackDemo() {
  const root = document.querySelector<HTMLDivElement>('#root');
  if (!root) throw new Error('Visual Stack root is missing.');

  let mode: Mode = 'overview';
  let selected: VisualKind = 'bar';
  let contractText = JSON.stringify(examples[selected], null, 2);
  let inspectorOpen = false;
  let streamTimer: number | undefined;
  const rendered = new Map<string, RenderedVisualization>();
  const clockLabel = (offsetSeconds = 0) => new Date(Date.now() + offsetSeconds * 1000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const rollingLabels = (count: number, stepSeconds: number) =>
    Array.from({ length: count }, (_, index) => clockLabel((index - count + 1) * stepSeconds));

  const escape = (value: unknown) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function destroyCharts() {
    if (streamTimer) window.clearInterval(streamTimer);
    streamTimer = undefined;
    for (const visual of rendered.values()) visual.destroy();
    rendered.clear();
  }

  function subscribeEditorInteractions() {
    rendered.get('editor-visual')?.onInteraction((event) => {
      const status = document.querySelector<HTMLElement>('#interaction-status');
      if (status) status.textContent = `${event.type}: ${event.name ?? event.seriesName ?? 'visual'}`
        + (event.value !== undefined ? ` · ${String(event.value)}` : '');
    });
  }

  function mount(id: string, contract: unknown) {
    const element = document.getElementById(id);
    if (!element) return;
    rendered.set(id, renderVisualization(element, contract));
  }

  function tile(kind: VisualKind) {
    const contract = examples[kind];
    return `<article class="visual-card col-4" data-kind="${kind}">
      <header><h2>${escape(contract.title)}</h2>
        <button type="button" data-open="${kind}">Inspect</button></header>
      <div class="visual-mount" id="visual-${kind}"></div>
      <footer>${escape(KIND_RULES[kind].use)}</footer></article>`;
  }

  function inspectorBody() {
    const rule = KIND_RULES[selected];
    return `<h2>${escape(examples[selected].title)}</h2><dl>
      <div><dt>Kind</dt><dd>${selected}</dd></div><div><dt>Family</dt><dd>${rule.family}</dd></div>
      <div><dt>Time</dt><dd>${rule.time}</dd></div><div><dt>Additive</dt><dd>${rule.additive ? 'yes' : 'no'}</dd></div>
      </dl><p>${escape(rule.use)}</p><pre>${escape(JSON.stringify(examples[selected], null, 2))}</pre>`;
  }

  function gallery() {
    return `<section class="intro"><p class="eyebrow">Visual collection</p><h1>One definition. Every visual.</h1>
      <p>Explore all ${VISUAL_KINDS.length} Visual Stack kinds.</p></section>
      <section class="visual-grid">${VISUAL_KINDS.map(tile).join('')}</section>`;
  }

  function overview() {
    return `<section class="hero hero-showcase">
      <div class="hero-copy"><p class="eyebrow">Visual Stack</p>
        <h1>Build the view.<br><span>Keep the context.</span></h1>
        <p>Visual Stack turns one governed result into the right visual—and multiple results into a coherent, responsive report.</p>
        <div class="hero-actions"><button type="button" data-mode="gallery">Explore ${VISUAL_KINDS.length} visuals</button>
          <button type="button" class="secondary" data-mode="editor">Build a visual</button></div>
        <dl class="hero-proof"><div><dt>${VISUAL_KINDS.length}</dt><dd>visual kinds</dd></div>
          <div><dt>1</dt><dd>stable definition</dd></div><div><dt>Live</dt><dd>in-place updates</dd></div></dl>
      </div>
      <div class="hero-visual" aria-label="Visual Stack report preview">
        <div class="hero-window"><div class="hero-window-bar"><span></span><span></span><span></span></div>
          <div class="hero-report-head"><div><small>Payments overview</small><strong>Today · UTC</strong></div><span>Live</span></div>
          <div class="hero-kpis"><div><small>Processed volume</small><strong>$684.2k</strong></div>
            <div><small>Success rate</small><strong>98.2%</strong></div><div><small>P95 latency</small><strong>184 ms</strong></div></div>
          <div class="hero-report-grid"><div class="hero-chart" id="overview-visual"></div>
            <div class="hero-side"><p>Payment methods</p><div><span>Card</span><strong>64%</strong></div>
              <div><span>Wallet</span><strong>22%</strong></div><div><span>Bank redirect</span><strong>10%</strong></div>
              <div><span>Pay later</span><strong>4%</strong></div></div></div>
          <div class="hero-incidents"><span class="incident-ok">Healthy</span>
            <p>processor_a recovered after a 3-minute timeout spike</p><small>2 min ago</small></div></div>
        <div class="hero-float"><span>Streaming</span><strong>84 payments/s</strong><small>Chart updated in place</small></div>
      </div></section>
      <section class="story-strip"><p>Designed for the full decision path</p>
        <div><span>01</span><strong>Choose</strong><small>the clearest visual for the question</small></div>
        <div><span>02</span><strong>Compose</strong><small>a readable report from many results</small></div>
        <div><span>03</span><strong>Explain</strong><small>the meaning, data and confidence</small></div>
        <div><span>04</span><strong>Refresh</strong><small>without losing the user’s place</small></div>
      </section>
      <section class="overview-section">
        <div class="section-heading"><p class="eyebrow">From snapshot to story</p><h2>More than a chart gallery.</h2>
          <p>Visual Stack decides the shape, packs the report, preserves context, and keeps it current.</p></div>
        <div class="capability-grid">
          <article><span>Choose</span><h2>Visual semantics</h2><p>Definitions describe the question, not a specific charting API.</p></article>
          <article><span>Compose</span><h2>Report layout</h2><p>KPIs, trends, comparisons, flows, and detail tables form one readable surface.</p></article>
          <article><span>Update</span><h2>Live data</h2><p>Validated snapshots refresh an existing visual without rebuilding the experience.</p></article>
          <article><span>Explain</span><h2>Inspectable results</h2><p>Every visual keeps its definition, rationale, and display metadata available.</p></article>
        </div>
      </section>
      <section class="audience-band"><div><p class="eyebrow">Built for product teams</p>
        <h2>Analytics that fits the application—not the other way around.</h2></div>
        <div class="audience-points"><p>✓ Framework-neutral rendering</p><p>✓ Single and multi-visual views</p>
          <p>✓ Theming through host design tokens</p><p>✓ Streaming and snapshot updates</p></div>
      </section>
      <section class="overview-cta"><p class="eyebrow">Start with the result</p><h2>Try the building blocks.</h2>
        <div><button type="button" data-mode="gallery">Explore the gallery</button>
          <button type="button" class="secondary" data-mode="live">Watch a live view</button></div></section>`;
  }

  function live() {
    return `<section class="intro"><p class="eyebrow">Live views</p><h1>Streaming without chart churn</h1>
      <p>Visual Stack receives validated snapshots from any host transport and updates the existing visual in place.</p></section>
      <section class="live-metrics">
        <article><p>Payments / second</p><strong id="live-throughput">87</strong><span class="live-positive">+6.4%</span></article>
        <article><p>P95 latency</p><strong id="live-latency">184 ms</strong><span>rolling 60s</span></article>
        <article><p>Success rate</p><strong id="live-success">98.2%</strong><span class="live-positive">healthy</span></article>
      </section>
      <section class="live-demo-grid">
        <article class="live-story"><div class="live-story-title"><div><p class="eyebrow">Payments per second</p>
            <h2>Live payment stream</h2></div><span class="live-pulse">Live</span></div>
          <div class="visual-mount live-hero" id="live-demo-visual"></div>
          <div class="live-controls"><button type="button" id="live-demo-toggle">Pause stream</button>
            <span id="live-status">Receiving 1 update / second</span></div>
          <ol class="event-stream" id="live-events" aria-label="Latest stream events"></ol></article>
        <aside class="live-copy"><h2>Transport is your choice</h2>
          <p>Connect SSE, WebSocket, polling, or an in-process event source in the host application.</p>
          <pre><code>source.onmessage = (event) => {
  visual.update(JSON.parse(event.data));
};</code></pre>
          <ul><li>Append or patch a live series</li><li>Throttle rapid events</li><li>Keep a bounded rolling window</li><li>Reuse interactions and cleanup</li></ul>
        </aside>
      </section>`;
  }

  function editor() {
    return `<section class="intro"><p class="eyebrow">Try Visual Stack</p><h1>Build and preview</h1>
      <p>Edit a visual definition, or paste several to compose a report.</p>
      <label class="example-select">Layout example
        <select id="layout-example">
          <option value="executive">Executive overview</option>
          <option value="operations">Operations</option>
          <option value="detail">Detail analysis</option>
        </select>
      </label>
      <button type="button" id="load-report">Load layout</button></section>
      <section class="editor-grid"><label class="editor-pane"><span>Visual definition</span>
        <textarea id="contract-editor" aria-label="Visualization contract JSON" spellcheck="false"
          aria-controls="editor-completions" aria-autocomplete="list">${escape(contractText)}</textarea>
        <div id="editor-completions" class="completion-list" role="listbox" hidden></div></label>
        <div class="preview-pane"><div class="preview-head"><span>Preview</span><div>
          <button type="button" id="copy-snapshot">Copy snapshot</button>
          <button type="button" id="export-svg">Export SVG</button></div></div>
          <div class="visual-mount editor-visual" id="editor-visual"></div><p id="contract-error" role="alert" hidden></p>
          <p class="interaction-status" id="interaction-status">Select or hover a point to inspect its interaction event. For live updates, open Live.</p>
        </div></section>`;
  }

  function updateInspector() {
    const inspector = document.querySelector<HTMLElement>('.inspector');
    if (inspector) inspector.innerHTML = inspectorBody();
  }

  function renderContractReport(values: unknown[], error: HTMLElement | null) {
    const contracts = values.map(parseVisualizationContract);
    const layout = layoutDashboard(contracts.map((contract, index) => ({
      id: `live-${index}`, kind: contract.kind, content: contract,
    })));
    if (!layout.ok) throw new Error(`The report layout is invalid: ${layout.reason}.`);
    const host = document.querySelector<HTMLElement>('#editor-visual');
    if (!host) return;
    for (const [key, visual] of rendered) {
      if (key === 'editor-visual' || key.startsWith('editor-live-')) {
        visual.destroy();
        rendered.delete(key);
      }
    }
    host.className = 'visual-mount editor-visual report-preview';
    host.innerHTML = layout.grid.items.map((item) =>
      `<article class="visual-card" data-kind="${item.content.kind}" style="grid-column:${item.layout.x + 1}/span ${item.layout.w};grid-row:${item.layout.y + 1}/span ${item.layout.h}">
        <header><h2>${escape(item.content.title)}</h2></header>
        <div class="visual-mount" id="editor-${item.id}"></div></article>`).join('');
    for (const item of layout.grid.items) mount(`editor-${item.id}`, item.content);
    if (error) error.hidden = true;
  }

  function renderEditor() {
    const error = document.querySelector<HTMLElement>('#contract-error');
    try {
      const raw = JSON.parse(contractText);
      if (Array.isArray(raw)) return renderContractReport(raw, error);
      const parsed = parseVisualizationContract(raw);
      selected = parsed.kind;
      const old = rendered.get('editor-visual');
      const host = document.querySelector<HTMLElement>('#editor-visual');
      if (host) host.className = 'visual-mount editor-visual';
      if (old) {
        try { old.update(parsed); }
        catch { old.destroy(); rendered.delete('editor-visual'); mount('editor-visual', parsed); }
      } else {
        mount('editor-visual', parsed);
      }
      if (error) error.hidden = true;
    } catch (cause) {
      if (!error) return;
      let detail = cause instanceof Error ? cause.message : 'Invalid definition.';
      try {
        const parsed = JSON.parse(contractText) as { kinds?: unknown };
        if (parsed?.kinds) detail = 'This is visualization planning guidance, not a display definition.';
      } catch { /* Keep the JSON error. */ }
      error.textContent = detail;
      error.hidden = false;
    }
    updateInspector();
  }

  function bind() {
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => {
      mode = button.dataset.mode as Mode;
      render();
    }));
    document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((button) => button.addEventListener('click', () => {
      if (mode !== 'gallery') return;
      selected = button.dataset.open as VisualKind;
      contractText = JSON.stringify(examples[selected], null, 2);
      inspectorOpen = true;
      updateInspector();
      document.querySelector('.inspector')?.removeAttribute('hidden');
    }));
    const input = document.querySelector<HTMLTextAreaElement>('#contract-editor');
    input?.addEventListener('input', () => {
      contractText = input.value;
      renderEditor();
      showCompletions(input);
    });
    input?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault();
        showCompletions(input, true);
      }
      if (event.key === 'Escape') hideCompletions();
      const active = document.querySelector<HTMLButtonElement>('#editor-completions button');
      if (active && (event.key === 'Tab' || event.key === 'Enter')) {
        event.preventDefault();
        active.click();
      }
    });
    document.querySelector('#load-report')?.addEventListener('click', () => {
      const preset = document.querySelector<HTMLSelectElement>('#layout-example')?.value ?? 'executive';
      const kinds: VisualKind[] = preset === 'operations'
        ? ['kpi', 'line', 'heatmap', 'bar', 'table']
        : preset === 'detail'
          ? ['line', 'scatter', 'heatmap', 'table']
          : ['kpi', 'kpi', 'line', 'donut', 'table'];
      const contracts = kinds.map((kind, index) => kind === 'kpi' && index === 1
        ? { ...examples.kpi, title: 'Success rate', unit: '%', value: 98.2 }
        : examples[kind]);
      contractText = JSON.stringify(contracts, null, 2);
      render();
    });
    if (mode === 'overview') startOverviewPreview();
    if (mode === 'gallery') for (const kind of VISUAL_KINDS) mount(`visual-${kind}`, examples[kind]);
    if (mode === 'live') startLiveDemo();
    if (mode === 'editor') {
      renderEditor();
      subscribeEditorInteractions();
    }

    const completionItems = [
      ...VISUAL_KINDS.map((kind) => ({ label: kind, insert: `"${kind}"`, detail: KIND_RULES[kind].use })),
      ...['kind', 'title', 'unit', 'value', 'data', 'categories', 'series', 'x', 'y', 'cells',
        'axes', 'points', 'links', 'columns', 'rows', 'layout', 'minHeight', 'maxHeight', 'aspectRatio']
        .map((key) => ({ label: key, insert: `"${key}"`, detail: `JSON field: ${key}` })),
    ];

    function hideCompletions() {
      const list = document.querySelector<HTMLElement>('#editor-completions');
      if (list) list.hidden = true;
    }

    function showCompletions(input: HTMLTextAreaElement, force = false) {
      const list = document.querySelector<HTMLElement>('#editor-completions');
      if (!list) return;
      const before = input.value.slice(0, input.selectionStart);
      const match = before.match(/["A-Za-z_][A-Za-z0-9_ -]*$/);
      const query = (match?.[0] ?? '').replaceAll('"', '').toLowerCase();
      const matches = completionItems.filter((item) => !query || item.label.toLowerCase().includes(query)).slice(0, 8);
      if (!force && query.length < 2 || !matches.length) { hideCompletions(); return; }
      list.replaceChildren(...matches.map((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'option');
        button.innerHTML = `<strong>${item.label}</strong><small>${escape(item.detail)}</small>`;
        button.addEventListener('click', () => {
          const start = input.selectionStart - (match?.[0].length ?? 0);
          input.setRangeText(item.insert, start, input.selectionStart, 'end');
          contractText = input.value;
          hideCompletions();
          input.focus();
          renderEditor();
        });
        return button;
      }));
      list.hidden = false;
    }
    document.querySelector('#copy-snapshot')?.addEventListener('click', async () => {
      const snapshot = rendered.get('editor-visual')?.snapshot();
      if (!snapshot) return;
      await navigator.clipboard.writeText(JSON.stringify(snapshot.contract, null, 2));
    });
    document.querySelector('#export-svg')?.addEventListener('click', () => {
      const svg = rendered.get('editor-visual')?.snapshot().svg;
      if (!svg) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      link.download = 'visual-stack.svg';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  function startLiveDemo() {
    const base = examples.line;
    if (base.kind !== 'line') return;
    const line = {
      ...base,
      title: 'Live payment stream',
      unit: 'payments / second',
      categories: rollingLabels(base.series[0]!.values.length, 1),
      series: [{ name: 'Payments', values: [...base.series[0]!.values] }],
    };
    mount('live-demo-visual', line);
    const visual = rendered.get('live-demo-visual');
    const button = document.querySelector<HTMLButtonElement>('#live-demo-toggle');
    const status = document.querySelector<HTMLElement>('#live-status');
    if (!visual || !button || !status) return;
    let current = line;
    let tick = 0;
    const events = document.querySelector<HTMLElement>('#live-events');
    const throughput = document.querySelector<HTMLElement>('#live-throughput');
    const latency = document.querySelector<HTMLElement>('#live-latency');
    const success = document.querySelector<HTMLElement>('#live-success');
    const start = () => {
      streamTimer = window.setInterval(() => {
        tick += 1;
        const latest = current.series.map((series) => ({
          ...series,
          values: [...series.values.slice(1), (series.values.at(-1) ?? 0) + Math.round(Math.sin(tick) * 7) + 3],
        }));
        const category = clockLabel();
        current = { ...current, categories: [...current.categories.slice(1), category], series: latest };
        visual.update({ category, values: Object.fromEntries(latest.map((series) => [
          series.name, series.values.at(-1) ?? 0,
        ])) }, { mode: 'append', maxPoints: 12, throttleMs: 100 });
        const rate = Math.max(60, 87 + Math.round(Math.sin(tick) * 9));
        if (throughput) throughput.textContent = String(rate);
        if (latency) latency.textContent = `${Math.round(168 + Math.cos(tick / 2) * 22)} ms`;
        if (success) success.textContent = `${(98.1 + Math.sin(tick / 3) * 0.3).toFixed(1)}%`;
        if (events) {
          const item = document.createElement('li');
          item.innerHTML = `<span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <strong>snapshot.${tick}</strong><small>${rate} payments/s · append</small>`;
          events.prepend(item);
          while (events.children.length > 5) events.lastElementChild?.remove();
        }

      }, 1000);
    };
    start();
    button.addEventListener('click', () => {
      if (streamTimer) {
        window.clearInterval(streamTimer);
        streamTimer = undefined;
        button.textContent = 'Resume stream';
        status.textContent = 'Stream paused';
      } else {
        start();
        button.textContent = 'Pause stream';
        status.textContent = 'Receiving 1 update / second';
      }
    });
  }

  function startOverviewPreview() {
    const line = {
      ...examples.line,
      kind: 'line' as const,
      title: 'Processed payments',
      unit: 'payments / min',
      categories: rollingLabels(8, 2),
      series: [{ name: 'Processed payments', values: [157, 171, 170, 171, 188, 198, 189, 199] }],
    };
    mount('overview-visual', line);
    const visual = rendered.get('overview-visual');
    if (!visual) return;
    let current = line;
    let tick = 0;
    streamTimer = window.setInterval(() => {
      tick += 1;
      current = {
        ...current,
        categories: [...current.categories.slice(1), clockLabel()],
        series: current.series.map((series) => ({
          ...series,
          values: [...series.values.slice(1), (series.values.at(-1) ?? 0)
            + Math.round(Math.sin(tick) * 4) + 2],
        })),
      };
      visual.update(current, { throttleMs: 80, maxPoints: 8 });
      visual.flush();
    }, 1600);
  }

  function render() {
    destroyCharts();
    root!.innerHTML = `<header class="topbar"><span class="wordmark">Visual Stack</span>
      <span class="tag">Visuals for every story</span><div class="spacer"></div>
      <nav class="seg" aria-label="Demo views">${(['overview', 'gallery', 'live', 'editor'] as Mode[]).map((view) =>
        `<button type="button" data-mode="${view}" aria-pressed="${mode === view}">${(view[0] ?? '').toUpperCase() + view.slice(1)}</button>`).join('')}</nav>
    </header>
      <div class="shell"><main>${mode === 'overview' ? overview() : mode === 'gallery' ? gallery() : mode === 'live' ? live() : editor()}</main>
        ${mode === 'gallery' ? `<aside class="inspector" aria-label="Inspector"${inspectorOpen ? '' : ' hidden'}>${inspectorBody()}</aside>` : ''}</div>`;
    bind();
  }

  render();
}
