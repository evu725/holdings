import test from 'node:test';
import assert from 'node:assert/strict';
import { discoveryText, narrationFor } from '../lib/discovery.ts';

test('voice or typed discovery works with no Gmail connection', () => {
  assert.equal(discoveryText('  I watch Netflix and use Instagram. ', []), 'I watch Netflix and use Instagram.');
  assert.equal(discoveryText('  ', []), '');
});
test('approved Gmail brands augment rather than replace the voice input', () => {
  assert.equal(discoveryText('I shop at Costco.', ['Netflix', 'Netflix', ' Nike ', '']), 'I shop at Costco.\nAdditional brands I selected: Netflix, Nike.');
  assert.equal(discoveryText('', ['Netflix']), 'Additional brands I selected: Netflix.');
  assert.equal(discoveryText('I shop at Costco.', []), 'I shop at Costco.');
});
test('spoken results use returned companies and explain unavailable brands', () => {
  const response = { matches: [{ symbol: 'NFLX', asset: { name: 'Netflix' }, why: 'Netflix is in the catalog.' }], unavailable: [{ brand: 'Nike' }], source: 'local' };
  const text = narrationFor(response);
  assert.match(text, /Netflix is in the catalog/);
  assert.match(text, /outside the current catalog: Nike/);
  assert.ok(text.endsWith('This is educational discovery, not investment advice.'));
});
test('narration handles empty results and bounds lengthy generated explanations', () => {
  assert.match(narrationFor({ matches: [], unavailable: [], source: 'local' }), /No matching companies/);
  const result = { matches: Array.from({ length: 8 }, (_, index) => ({ symbol: `S${index}`, asset: { name: 'x'.repeat(500) }, why: 'y'.repeat(10000) })), unavailable: [], source: 'grok' };
  const text = narrationFor(result);
  assert.ok(text.length <= 4000);
  assert.match(text, /More matches are shown on screen/);
  assert.ok(text.endsWith('This is educational discovery, not investment advice.'));
});
