import { KIND_RULES } from './kinds.js';
import type { VisualKind } from './kinds.js';

export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface GridItem<T> {
  readonly id: string;
  readonly layout: Placement;
  readonly content: T;
}

export interface GridSchema<T> {
  readonly columns?: number;
  readonly items: readonly GridItem<T>[];
}

export type LayoutIssue = 'duplicate' | 'missing' | 'bounds' | 'overlap' | 'invalid';
export type GridResult<T> =
  | { readonly ok: true; readonly grid: GridContainer<T> }
  | { readonly ok: false; readonly reason: LayoutIssue };

function isInteger(value: number) {
  return Number.isSafeInteger(value);
}

function overlaps(a: Placement, b: Placement) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class GridContainer<T> {
  private constructor(
    readonly columns: number,
    readonly items: readonly GridItem<T>[],
  ) {}

  static create<T>(schema: GridSchema<T>): GridResult<T> {
    const columns = schema.columns ?? 12;
    if (!isInteger(columns) || columns < 1) return { ok: false, reason: 'invalid' };
    let grid = new GridContainer<T>(columns, []);
    for (const item of schema.items) {
      const result = grid.addItem(item);
      if (!result.ok) return result;
      grid = result.grid;
    }
    return { ok: true, grid };
  }

  addItem(item: GridItem<T>): GridResult<T> {
    if (!item.id.trim()) return { ok: false, reason: 'invalid' };
    if (this.items.some(({ id }) => id === item.id)) return { ok: false, reason: 'duplicate' };
    return this.place(item);
  }

  updateItem(id: string, patch: Partial<Pick<GridItem<T>, 'layout' | 'content'>>): GridResult<T> {
    const index = this.items.findIndex((item) => item.id === id);
    const item = this.items[index];
    if (!item) return { ok: false, reason: 'missing' };
    return this.place({ ...item, ...patch }, index);
  }

  removeItem(id: string): GridResult<T> {
    if (!this.items.some((item) => item.id === id)) return { ok: false, reason: 'missing' };
    return { ok: true, grid: new GridContainer(this.columns, this.items.filter((item) => item.id !== id)) };
  }

  private place(item: GridItem<T>, index = -1): GridResult<T> {
    const { x, y, w, h } = item.layout;
    if (![x, y, w, h, x + w, y + h].every(isInteger) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > this.columns) {
      return { ok: false, reason: 'bounds' };
    }
    if (this.items.some((other, i) => i !== index && overlaps(other.layout, item.layout))) {
      return { ok: false, reason: 'overlap' };
    }
    const snapshot = { ...item, layout: { ...item.layout } };
    const items = index < 0
      ? [...this.items, snapshot]
      : this.items.map((other, i) => i === index ? snapshot : other);
    return { ok: true, grid: new GridContainer(this.columns, items) };
  }
}

export function editPlacement(layout: Placement, mode: 'move' | 'resize', dx: number, dy: number): Placement {
  return mode === 'move'
    ? { ...layout, x: layout.x + dx, y: layout.y + dy }
    : { ...layout, w: layout.w + dx, h: layout.h + dy };
}

export const Schema = { create: GridContainer.create };

export interface DashboardTile<T> {
  readonly id: string;
  readonly kind: VisualKind;
  readonly content: T;
}

/**
 * Pack tiles into a dense, gap-free dashboard in reading order: KPIs share the
 * first rows evenly, tables go last, and each tile widens to fill its row.
 */
export function layoutDashboard<T>(tiles: readonly DashboardTile<T>[], columns = 12): GridResult<T> {
  const kpis = tiles.filter((tile) => tile.kind === 'kpi');
  const charts = tiles.filter((tile) => tile.kind !== 'kpi' && tile.kind !== 'table');
  const tables = tiles.filter((tile) => tile.kind === 'table');
  const items: GridItem<T>[] = [];
  let y = 0;

  const perRow = Math.max(1, Math.floor(columns / KIND_RULES.kpi.size.w));
  for (let start = 0; start < kpis.length; start += perRow) {
    const row = kpis.slice(start, start + perRow);
    const width = Math.floor(columns / row.length);
    row.forEach((tile, index) => {
      const w = index === row.length - 1 ? columns - width * index : width;
      items.push({ id: tile.id, content: tile.content, layout: { x: width * index, y, w, h: 1 } });
    });
    y += 1;
  }

  let x = 0;
  let rowHeight = 0;
  let rowStart = items.length;
  const closeRow = () => {
    const last = items[items.length - 1];
    if (items.length > rowStart && last && x < columns) {
      items[items.length - 1] = { ...last, layout: { ...last.layout, w: columns - last.layout.x } };
    }
    y += rowHeight;
    x = 0;
    rowHeight = 0;
    rowStart = items.length;
  };
  for (const tile of [...charts, ...tables]) {
    const { w: preferred, h } = KIND_RULES[tile.kind].size;
    const w = Math.min(preferred, columns);
    if (x + w > columns || (rowHeight && h !== rowHeight)) closeRow();
    items.push({ id: tile.id, content: tile.content, layout: { x, y, w, h } });
    x += w;
    rowHeight = h;
  }
  closeRow();
  return GridContainer.create({ columns, items });
}
