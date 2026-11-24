import { StrictMode, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { createChart, editPlacement, Schema } from '../../src/index.js';
import type { ChartSpec, GridContainer, GridItem, LayoutIssue, Placement } from '../../src/index.js';
import { recent, sampleItems, title } from './fixture.js';
import type { Widget } from './fixture.js';
import './style.css';

const initial = Schema.create({ items: sampleItems });
if (!initial.ok) throw new Error(`Invalid board fixture: ${initial.reason}`);
const initialGrid = initial.grid;
const tabs = ['Reasoning', 'Contract', 'SQL'] as const;
type Tab = typeof tabs[number];
type Edit = 'move' | 'resize';

const messages: Record<LayoutIssue, string> = {
  overlap: 'That placement overlaps another block.',
  bounds: 'That placement is outside the grid or smaller than one cell.',
  duplicate: 'That block already exists.',
  invalid: 'That block configuration is invalid.',
  missing: 'That block could not be found.',
};

type Gesture = {
  id: string;
  pointer: number;
  mode: Edit;
  layout: Placement;
  startX: number;
  startY: number;
  column: number;
  gap: number;
  rows: number[];
};

function snapRow(gesture: Gesture, delta: number) {
  const { gap, layout, mode, rows } = gesture;
  const anchor = mode === 'move' ? layout.y : layout.y + layout.h;
  const direction = Math.sign(delta);
  let step = 0;
  let remaining = Math.abs(delta);
  while (direction && remaining > 0) {
    const index = direction > 0 ? anchor + step : anchor + step - 1;
    const distance = (rows[index] ?? 100) + gap;
    if (remaining < distance / 2) break;
    step += direction;
    remaining -= distance;
  }
  return step;
}

function Chart({ spec }: { spec: ChartSpec }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) throw new Error('Chart mount is missing.');
    return createChart(element.current, spec).destroy;
  }, [spec]);
  return <div ref={element} />;
}

function CardContent({ widget }: { widget: Widget }) {
  if (widget.kind === 'kpi') return <>
    <div className="value">{widget.value}</div>
    <div className={widget.negative ? 'delta negative' : 'delta'}>{widget.delta}</div>
  </>;
  if (widget.kind === 'chart') return <>
    <Chart spec={widget.spec} />
    {widget.legend && <div className="legend"><span>Revenue (USD m/day)</span><span>Seat load factor (%)</span></div>}
  </>;
  return <table>
    <thead><tr><th>Route</th><th>Load</th><th>Margin</th></tr></thead>
    <tbody>{widget.rows.map(([route, rate, margin]) => <tr key={route}>
      <td>{route}</td><td>{rate}</td><td className={margin.startsWith('−') ? 'negative' : undefined}>{margin}</td>
    </tr>)}</tbody>
  </table>;
}

function App() {
  const [grid, setGrid] = useState(initialGrid);
  const [preview, setPreview] = useState<GridContainer<Widget>>();
  const [board, setBoard] = useState(true);
  const [inspector, setInspector] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState<Tab>('Reasoning');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [layoutStatus, setLayoutStatus] = useState('');
  const gridElement = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const inspectorButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<Gesture>(null);
  const tabButtons = useRef<Partial<Record<Tab, HTMLButtonElement>>>({});
  const focusComposer = useRef(false);
  const focusInspector = useRef(false);

  useEffect(() => {
    if (!board && focusComposer.current) {
      composer.current?.focus();
      focusComposer.current = false;
    }
  }, [board]);

  useEffect(() => {
    if (inspector && focusInspector.current) {
      tabButtons.current[tab]?.focus();
      focusInspector.current = false;
    }
  }, [inspector, selected, tab]);

  function switchMode(next: boolean) {
    gesture.current = null;
    setPreview(undefined);
    setBoard(next);
  }

  function inspect(id: string, nextTab: Tab = 'Reasoning') {
    if (inspector && selected === id && tab === nextTab) tabButtons.current[nextTab]?.focus();
    else focusInspector.current = true;
    setSelected(id);
    setTab(nextTab);
    setInspector(true);
  }

  function closeInspector() {
    setInspector(false);
    inspectorButton.current?.focus();
  }

  function run(questionText: string) {
    const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
    const match = recent.find((entry) => normalize(entry.question) === normalize(questionText));
    setResult(match?.id);
    setFeedback(match ? 'Sample answer shown.' : 'No fixture matches that question. Try a recent sample question below.');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(question);
  }

  function begin(event: PointerEvent<HTMLButtonElement>, item: GridItem<Widget>, mode: Edit) {
    const element = gridElement.current;
    if (!element || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const css = getComputedStyle(element);
    if (css.getPropertyValue('--stacked').trim() === '1') return;
    const columns = css.gridTemplateColumns.split(' ');
    gesture.current = {
      id: item.id, pointer: event.pointerId, mode, layout: item.layout,
      startX: event.clientX, startY: event.clientY,
      column: (parseFloat(columns[0] ?? '') || 0) + parseFloat(css.columnGap),
      gap: parseFloat(css.rowGap), rows: css.gridTemplateRows.split(' ').map((row) => parseFloat(row)),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setLayoutStatus('');
  }

  function updateGesture(event: PointerEvent<HTMLButtonElement>, finish: boolean) {
    const active = gesture.current;
    if (!active || active.pointer !== event.pointerId) return;
    const dx = Math.round((event.clientX - active.startX) / active.column);
    const dy = snapRow(active, event.clientY - active.startY);
    const next = grid.updateItem(active.id, { layout: editPlacement(active.layout, active.mode, dx, dy) });
    if (finish) {
      gesture.current = null;
      setPreview(undefined);
      if (dx || dy) {
        if (next.ok) setGrid(next.grid);
        setLayoutStatus(next.ok ? 'Board layout updated.' : messages[next.reason]);
      }
    } else {
      setPreview(next.ok ? next.grid : undefined);
    }
  }

  function cancelGesture(event: PointerEvent<HTMLButtonElement>) {
    if (gesture.current?.pointer !== event.pointerId) return;
    gesture.current = null;
    setPreview(undefined);
    setLayoutStatus('Layout edit cancelled.');
  }

  function editWithKeys(event: KeyboardEvent<HTMLButtonElement>, item: GridItem<Widget>, mode: Edit) {
    if (gesture.current) return;
    const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as const;
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') return;
    event.preventDefault();
    const [dx, dy] = offsets[key];
    const next = grid.updateItem(item.id, { layout: editPlacement(item.layout, mode, dx, dy) });
    if (next.ok) setGrid(next.grid);
    setLayoutStatus(next.ok ? 'Board layout updated.' : messages[next.reason]);
  }

  function handle(item: GridItem<Widget>, mode: Edit) {
    const label = mode === 'move' ? 'Move' : 'Resize';
    return <button className={`handle ${mode}`} type="button" aria-label={`${label} ${item.content.title}`}
      title={`${label} with pointer or arrow keys`}
      onPointerDown={(event) => begin(event, item, mode)} onPointerMove={(event) => updateGesture(event, false)}
      onPointerUp={(event) => updateGesture(event, true)} onPointerCancel={cancelGesture}
      onLostPointerCapture={cancelGesture} onKeyDown={(event) => editWithKeys(event, item, mode)}>
      {mode === 'move' ? '⠿' : '◢'}
    </button>;
  }

  function card(item: GridItem<Widget>, positioned: boolean) {
    const { id, layout: { x, y, w, h }, content } = item;
    return <article className={`block ${content.kind}${content.kind === 'kpi' && content.alert ? ' alert' : ''}`}
      key={id} data-widget={id} data-selected={inspector && selected === id}
      style={positioned ? { gridColumn: `${x + 1} / span ${w}`, gridRow: `${y + 1} / span ${h}` } : undefined}>
      <header className="block-head"><h2>{content.title}</h2><div className="block-actions">
        <button type="button" aria-label={`Inspect ${content.title}`} onClick={() => inspect(id)}>Inspect</button>
        {positioned && handle(item, 'move')}
      </div></header>
      <div className="block-body"><CardContent widget={content} /></div>
      <footer className="provenance">
        {content.provenance.map((entry) => <span key={entry}
          className={entry === 'owner sign-off pending' ? 'caution' : undefined}>{entry}</span>)}
        {content.sql && <button type="button" className="text-button" onClick={() => inspect(id, 'SQL')}>SQL ↗</button>}
      </footer>
      {positioned && handle(item, 'resize')}
    </article>;
  }

  const activeItem = grid.items.find(({ id }) => id === selected);
  const answerItem = grid.items.find(({ id }) => id === result);
  const visibleItems = board ? (preview ?? grid).items : answerItem ? [answerItem] : grid.items;
  return <>
    <header className="topbar">
      <span className="wordmark">Insight</span>
      <nav className="crumb" aria-label="Workspace"><span>Workspaces</span><span>/</span><strong>Sample network revenue — Q2 FY26</strong></nav>
      <div className="spacer" />
      <span className="sample mono">Sample data</span>
      <div className="seg" role="group" aria-label="View">
        <button aria-pressed={!board} onClick={() => switchMode(false)}>Thread</button>
        <button aria-pressed={board} onClick={() => switchMode(true)}>Board</button>
      </div>
      <button className="btn" ref={inspectorButton} aria-expanded={inspector} aria-controls="inspector"
        onClick={() => setInspector(!inspector)}>Inspector</button>
      <button className="btn demo-disabled" disabled>Export</button>
      <button className="btn primary demo-disabled" disabled>Share</button>
    </header>
    <div className="shell">
      <aside className="rail">
        <section><h2>In scope</h2>
          <dl>{[['fct_bookings', '412M'], ['dim_route', '1,840'], ['fct_capacity', '88M'],
            ['dim_customer', '18h old'], ['fct_ancillary', 'not used']].map(([name, value]) =>
            <div className="source" key={name}><dt>{name}</dt><dd className="mono">{value}</dd></div>)}</dl>
        </section>
        <section><h2>Governance</h2><dl className="governance">
          <div><dt>Row-level security</dt><dd>On</dd></div>
          <div><dt>Masked columns</dt><dd>2</dd></div>
          <div><dt>Your role</dt><dd>Network analyst</dd></div>
        </dl></section>
        <section><h2>On this board</h2><p>{grid.items.length} sample blocks</p><p>{recent.length} sample questions</p></section>
      </aside>
      <main className="canvas">
        <div className="scroll"><div className="wrap">
          {board && <div className="board-head">
            <h1>{title}</h1><div className="spacer" /><span className="mono">sample run 24 Jul 06:12 UTC · 3.4s</span>
            <button className="btn" disabled>Refresh</button>
          </div>}
          {!board && <h1 className="sr-only">Network revenue thread</h1>}
          {(board || !feedback) && <div className="answer">
            <p>Q2 network revenue reached <strong>USD 4.21bn</strong>, up 6.2% year on year, carried almost entirely by Europe and Far East.
              Three long-haul routes are running below break-even at load factors under 67%, and <em>the drop is concentrated in the last five weeks</em>.</p>
            <div className="caveat">Route profitability uses an allocated-cost model that no data owner has signed off.
              Treat the margin column as directional. <button className="text-button" onClick={() => inspect('routes')}>See the allocation ↗</button>
            </div>
          </div>}
          {!board && <p className="feedback" role="status">{feedback}</p>}
          <p className="sr-only" role="status">{layoutStatus}</p>
          <div className={`grid ${board ? 'board' : 'thread'}`} ref={gridElement}>
            {(board || !feedback || answerItem) && visibleItems.map((item) => card(item, board))}
          </div>
        </div></div>
        <div className={`composer${board ? ' slim' : ''}`}><div className="wrap">
          {board ? <div className="slimbar">
            <button className="btn" onClick={() => { focusComposer.current = true; switchMode(false); }}>Ask a question</button>
            <span>Answers land in the thread. Try a sample question.</span>
          </div> : <>
            <form className="composer-box" onSubmit={submit}>
              <div className="scope"><span>Ask about</span><span className="chip">Network revenue ▾</span>
                <span className="spacer" /><span>Fixture data only</span></div>
              <textarea ref={composer} rows={2} placeholder={recent[2].question} aria-label="Question" value={question}
                onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(question); }
                }} />
              <div className="composer-row"><span className="mono">Ctrl / ⌘ + Enter to run</span><span className="spacer" />
                <button className="btn primary">Run</button></div>
            </form>
            <div className="recent">{recent.map(({ time, question: text, count }) =>
              <button key={text} onClick={() => { setQuestion(text); run(text); }}><span className="mono">{time}</span>
                <span>{text}</span><span className="mono">{count}</span></button>)}</div>
          </>}
        </div></div>
      </main>
      <aside className="inspector" id="inspector" aria-label="Inspector" hidden={!inspector}
        onKeyDown={(event) => { if (event.key === 'Escape') closeInspector(); }}>
        <div className="inspector-top"><div className="tabs" role="tablist" aria-label="Inspection details">
          {tabs.map((name, index) => <button key={name} ref={(el) => { if (el) tabButtons.current[name] = el; }}
            id={`tab-${name}`} role="tab" aria-selected={tab === name} aria-controls="inspection-panel"
            tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)}
            onKeyDown={(event) => {
              const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
              const nextTab = tabs[next];
              if (!nextTab) return;
              event.preventDefault();
              setTab(nextTab);
              tabButtons.current[nextTab]?.focus();
            }}>{name}</button>)}
        </div><button className="close" type="button" aria-label="Close inspector" onClick={closeInspector}>×</button></div>
        <div className="inspector-body" role="tabpanel" id="inspection-panel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
          <h2>{activeItem?.content.title ?? title}</h2>
          {tab === 'Reasoning' && (activeItem ? <p>{activeItem.content.reasoning}</p>
            : <ol>{grid.items.filter(({ content }) => content.kind !== 'kpi').map(({ id, content }) =>
              <li key={id}>{content.reasoning}</li>)}</ol>)}
          {tab === 'Contract' && <pre>{JSON.stringify(activeItem
            ? { id: activeItem.id, layout: activeItem.layout, kind: activeItem.content.kind, provenance: activeItem.content.provenance }
            : { columns: grid.columns, blocks: grid.items.map(({ id, layout, content }) => ({ id, layout, kind: content.kind })) },
          null, 2)}</pre>}
          {tab === 'SQL' && (activeItem?.content.sql
            ? <pre>{activeItem.content.sql}</pre> : <p>No sample SQL is available for this selection.</p>)}
        </div>
      </aside>
    </div>
  </>;
}

const root = document.getElementById('root');
if (!root) throw new Error('React root is missing.');
createRoot(root).render(<StrictMode><App /></StrictMode>);
