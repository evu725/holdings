import test from 'node:test';
import assert from 'node:assert/strict';
import { saveDiscovery, readSaved, removeSaved } from '../lib/saved-discoveries.ts';
test('saved discoveries survive reopening, stay bounded and can be removed', () => {
  const values = new Map();
  const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readSaved(store), []);
  for (let i = 0; i < 22; i++) saveDiscovery(store, [{ symbol: `S${i}`, company: 'Company', why: 'A familiar brand.' }]);
  const saved = readSaved(store);
  assert.equal(saved.length, 20);
  assert.equal(saved[0].companies[0].symbol, 'S21');
  assert.equal(removeSaved(store, saved[0].id).length, 19);
});
test('storage errors propagate so the UI never falsely reports success', () => {
  assert.throws(() => saveDiscovery({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, [{ symbol: 'NFLX', company: 'Netflix', why: 'Matched brand' }]), /quota/);
});
