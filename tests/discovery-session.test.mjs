import test from 'node:test';
import assert from 'node:assert/strict';
import { readReviewedBrands, saveReviewedBrands } from '../lib/discovery-session.ts';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
test('reviewed brands survive page navigation and clear on removal', () => {
  const tab = storage();
  saveReviewedBrands(tab, ['Netflix', 'Costco']);
  assert.deepEqual(readReviewedBrands(tab), ['Netflix', 'Costco']);
  assert.deepEqual(readReviewedBrands(storage()), []);
  saveReviewedBrands(tab, []);
  assert.deepEqual(readReviewedBrands(tab), []);
});
test('expired or malformed saved selections never affect discovery', () => {
  for (const value of ['not-json', JSON.stringify({ brands: ['Netflix'], expiresAt: Date.now() - 1 }), JSON.stringify({ brands: 'Netflix', expiresAt: Date.now() + 10000 })]) {
    assert.deepEqual(readReviewedBrands({ getItem: () => value }), []);
  }
});
