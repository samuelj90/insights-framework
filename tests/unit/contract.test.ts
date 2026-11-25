import { expect, it } from 'vitest';
import { parseVisualizationContract } from '../../src/index.js';

it('accepts a bar contract and rejects malformed data and extra fields', () => {
  const valid = { kind: 'bar', title: 'Revenue', unit: 'AED', data: [{ label: 'East', value: 4 }] };
  expect(parseVisualizationContract(valid)).toEqual(valid);
  for (const invalid of [
    { ...valid, version: '1' },
    { ...valid, data: [{ label: 'East', value: NaN }] },
    { ...valid, data: [{ label: '  ', value: 1 }] },
    { ...valid, data: [] },
    { ...valid, extra: true },
  ]) expect(() => parseVisualizationContract(invalid)).toThrow(TypeError);
});

it('allows a donut with a positive total and rejects an undefined share', () => {
  const donut = { kind: 'donut', title: 'Share', unit: '%', data: [{ label: 'East', value: 4 }] };
  expect(parseVisualizationContract(donut)).toEqual(donut);
  expect(() => parseVisualizationContract({ ...donut, data: [{ label: 'East', value: 0 }] })).toThrow(/positive total/);
});
