import { describe, expect, it } from 'vitest';
import { editPlacement, Schema } from '../../src/index.js';

const first = { id: 'first', layout: { x: 0, y: 0, w: 3, h: 1 }, content: 'first widget' };
const second = { id: 'second', layout: { x: 3, y: 0, w: 4, h: 1 }, content: 'second widget' };

function board() {
  const result = Schema.create({ items: [first, second] });
  if (!result.ok) throw new Error(result.reason);
  return result.grid;
}

describe('Visual Stack layout', () => {
  it('rejects duplicate IDs, fractional positions, and invalid column counts', () => {
    expect(Schema.create({ items: [first, first] })).toEqual({ ok: false, reason: 'duplicate' });
    expect(Schema.create({ items: [{ ...first, layout: { ...first.layout, y: 0.5 } }] }))
      .toEqual({ ok: false, reason: 'bounds' });
    expect(Schema.create({ columns: 0, items: [] })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects invalid resize and overlap without altering the accepted board', () => {
    const grid = board();
    expect(grid.updateItem(first.id, { layout: editPlacement(first.layout, 'resize', 1, 0) }))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(grid.updateItem(second.id, { layout: editPlacement(second.layout, 'resize', 6, 0) }))
      .toEqual({ ok: false, reason: 'bounds' });
    expect(grid.items).toEqual([first, second]);
  });

  it('uses the updated rectangle after moving, editing content, and freeing the old cells', () => {
    const grid = board();
    const result = grid.updateItem(first.id, { layout: { ...first.layout, y: 1 }, content: 'updated' });
    if (!result.ok) throw new Error(result.reason);
    expect(result.grid.items[0]).toMatchObject({ content: 'updated', layout: { x: 0, y: 1, w: 3, h: 1 } });
    expect(result.grid.addItem({ ...first, id: 'third' }).ok).toBe(true);
    const removed = result.grid.removeItem(second.id);
    if (!removed.ok) throw new Error(removed.reason);
    expect(removed.grid.addItem({ ...second, id: 'replacement' }).ok).toBe(true);
  });
});
