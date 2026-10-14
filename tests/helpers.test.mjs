import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemInput, visibleItems, countLabel, resolveLanguage, t } from '../dist/shopping-list-card.js';

test('quantity is split from the name in every supported form', () => {
  assert.deepEqual(parseItemInput('2 kg arroz'), { name: 'arroz', quantity: '2 kg' });
  assert.deepEqual(parseItemInput('arroz, 2 kg'), { name: 'arroz', quantity: '2 kg' });
  assert.deepEqual(parseItemInput('arroz 2kg'), { name: 'arroz', quantity: '2 kg' });
  assert.deepEqual(parseItemInput('6 ovos'), { name: 'ovos', quantity: '6' });
  assert.deepEqual(parseItemInput('1,5 L leite'), { name: 'leite', quantity: '1,5 l' });
  assert.deepEqual(parseItemInput('  Chia  '), { name: 'Chia', quantity: '' });
  assert.deepEqual(parseItemInput('Gelatina 0'), { name: 'Gelatina 0', quantity: '' });
  assert.deepEqual(parseItemInput('pão, de forma'), { name: 'pão, de forma', quantity: '' });
  assert.equal(parseItemInput('   '), null);
});

test('completed and pending items are hidden and the rest sorted alphabetically', () => {
  const items = [
    { uid: '1', summary: 'chia', status: 'needs_action' },
    { uid: '2', summary: 'Arroz', status: 'needs_action' },
    { uid: '3', summary: 'Banana', status: 'completed' },
    { uid: '4', summary: 'água', status: 'needs_action' }
  ];
  assert.deepEqual(visibleItems(items).map((item) => item.uid), ['4', '2', '1']);
  assert.deepEqual(visibleItems(items, new Set(['2'])).map((item) => item.uid), ['4', '1']);
});

test('language follows Home Assistant and counts agree in number', () => {
  assert.equal(resolveLanguage({ locale: { language: 'pt-BR' } }), 'pt');
  assert.equal(resolveLanguage({ language: 'de' }), 'en');
  assert.equal(countLabel('pt', 1), '1 item');
  assert.equal(countLabel('pt', 5), '5 itens');
  assert.equal(countLabel('en', 2), '2 items');
  assert.equal(t('pt', 'bought', { name: 'Chia' }), 'Chia comprado');
});
