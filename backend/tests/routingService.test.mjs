import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCategoryCode } from '../src/services/routingService.js';

test('detectCategoryCode routes Kinyarwanda water complaints to infrastructure', () => {
  assert.equal(detectCategoryCode('Amazi yacitse kandi umuyoboro waturitse'), 'infrastructure-sanitation');
});

test('detectCategoryCode routes misconduct complaints to governance', () => {
  assert.equal(detectCategoryCode('An officer asked for a bribe before service'), 'governance-accountability');
});

test('detectCategoryCode falls back to citizen services', () => {
  assert.equal(detectCategoryCode('I need help from the sector office'), 'citizen-services');
});
