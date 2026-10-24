import test from 'node:test';
import assert from 'node:assert/strict';
import { toFrontendMatch } from '../lib/frontend-adapter.ts';

test('real API matches feed teammate cards without mock identifiers or invented brand attribution', () => {
  const api = { matches: [{ symbol: 'META', why: 'Instagram is Meta Platforms', asset: { id: 'catalog-meta', symbol: 'META', name: 'Meta Platforms', issuer: 'Coinbase on Base', venue: 'defi', tradeable: true } }], unavailable: [{ brand: 'Nike', parent: 'Nike' }], source: 'local' };
  const result = toFrontendMatch(api);
  assert.deepEqual(result.available[0], { symbol: 'META', why: 'Instagram is Meta Platforms', assetId: 'catalog-meta', company: 'Meta Platforms', issuer: 'Coinbase on Base', venue: 'defi', tradeable: true, brand: '' });
  assert.deepEqual(result.unavailable, api.unavailable);
  assert.match(result.spokenSummary, /Meta Platforms/);
});
test('empty results render a useful summary and preserve unavailable brands', () => {
  const result = toFrontendMatch({ matches: [], unavailable: [{ brand: 'Nike', parent: 'Nike' }], source: 'local' });
  assert.deepEqual(result.available, []);
  assert.equal(result.unavailable[0].brand, 'Nike');
  assert.match(result.spokenSummary, /No matching companies/);
});
