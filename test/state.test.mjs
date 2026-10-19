import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce } from '../public/js/state.mjs';
import { messages } from '../public/js/messages.mjs';

const act = (state, type, rest = {}, language = 'en') => reduce(state, { type, ...rest }, language);
function filled(language = 'en') {
  let state = initialState();
  for (const [field, value] of [['installAreas.0.lengthMetersRaw', '3'], ['installAreas.0.widthMetersRaw', '4'], ['tileLengthCmRaw', '60'], ['tileWidthCmRaw', '60'], ['boxPiecesRaw', '4']]) state = act(state, 'edit', { field, value });
  return act(state, 'calculate', {}, language);
}

test('state: exact initial defaults and no automatic calculation', () => {
  const state = initialState();
  assert.deepEqual(state.draft, { installAreas: [{ id: 'area-1', nameRaw: '', lengthMetersRaw: '', widthMetersRaw: '' }], deductionAreas: [], tileLengthCmRaw: '', tileWidthCmRaw: '', boxPiecesRaw: '10', reservePercentRaw: '10.0' });
  assert.equal(state.hasWork, false); assert.equal(state.result, null); assert.equal(state.report, '');
  const invalid = act(state, 'calculate'); assert.deepEqual(invalid.error, { code: 'invalid_number', field: 'installAreas.0.lengthMetersRaw' }); assert.equal(invalid.result, null);
});
test('state: R0 remains explicit and snapshots are invalidated synchronously by every input', () => {
  for (const [field, value] of [['installAreas.0.nameRaw', '客廳'], ['installAreas.0.lengthMetersRaw', '5'], ['installAreas.0.widthMetersRaw', '6'], ['tileLengthCmRaw', '30'], ['tileWidthCmRaw', '40'], ['boxPiecesRaw', '5'], ['reservePercentRaw', '0']]) {
    const state = filled(); assert.equal(state.result.totals.boxes, '10'); assert.ok(state.report.startsWith('Tile and Panel'));
    const changed = act(state, 'edit', { field, value }); assert.equal(changed.result, null); assert.equal(changed.report, ''); assert.equal(changed.error, null); assert.equal(changed.status, 'changed');
  }
});
test('state: add and remove invalidate snapshots, keep order and avoid duplicate IDs', () => {
  let state = filled(); state = act(state, 'add', { group: 'installAreas' }); assert.equal(state.result, null); assert.equal(state.report, '');
  state = act(state, 'edit', { field: 'installAreas.1.nameRaw', value: 'Second' });
  state = act(state, 'remove', { group: 'installAreas', index: 0 }); assert.equal(state.draft.installAreas[0].nameRaw, 'Second');
  state = act(state, 'add', { group: 'installAreas' }); assert.equal(new Set(state.draft.installAreas.map(r => r.id)).size, 2);
  state = act(state, 'add', { group: 'deductionAreas' }); assert.equal(state.draft.deductionAreas.length, 1);
  state = act(state, 'remove', { group: 'deductionAreas', index: 0 }); assert.equal(state.draft.deductionAreas.length, 0);
});
test('state: bounded forty-row drafts and last installed row cannot be removed', () => {
  let state = initialState(); assert.equal(act(state, 'remove', { group: 'installAreas', index: 0 }), state);
  for (let i = 0; i < 25; i += 1) for (const group of ['installAreas', 'deductionAreas']) state = act(state, 'add', { group });
  assert.equal(state.draft.installAreas.length, 20); assert.equal(state.draft.deductionAreas.length, 20);
  assert.equal(new Set([...state.draft.installAreas, ...state.draft.deductionAreas].map(r => r.id)).size, 40);
});
test('state: clear and language cancellation preserve exact work and report', () => {
  for (const type of ['request-clear', 'request-language']) {
    const state = filled(); const before = JSON.stringify(state);
    const pending = act(state, type); assert.equal(pending.confirmation, type === 'request-clear' ? 'clear' : 'language');
    assert.deepEqual(act(pending, 'cancel'), state); assert.equal(JSON.stringify(state), before);
    assert.deepEqual(act(pending, 'confirm'), initialState());
  }
});
test('state: pending confirmation blocks edits and calculation; no-work requests stay idle', () => {
  const initial = initialState(); assert.equal(act(initial, 'request-clear'), initial); assert.equal(act(initial, 'request-language'), initial);
  const pending = act(filled(), 'request-clear');
  assert.equal(act(pending, 'edit', { field: 'tileLengthCmRaw', value: '1' }), pending); assert.equal(act(pending, 'calculate'), pending);
});
test('state: reset erases all inputs, confirmation, error, results and report', () => {
  const state = act(filled(), 'request-language'); assert.deepEqual(act(state, 'reset'), initialState());
  const invalid = act(act(filled(), 'edit', { field: 'reservePercentRaw', value: 'bad' }), 'calculate');
  assert.equal(invalid.result, null); assert.equal(invalid.report, ''); assert.deepEqual(act(invalid, 'reset'), initialState());
});
test('state: input drafts preserve IME text, comma, full-width and unformatted ASCII exactly', () => {
  let state = initialState();
  for (const value of ['拼', '拼字中', '１．５', '1,5', ' 0001.250 ']) {
    state = act(state, 'edit', { field: 'installAreas.0.lengthMetersRaw', value });
    assert.equal(state.draft.installAreas[0].lengthMetersRaw, value); assert.equal(state.error, null);
  }
  state = act(state, 'edit', { field: 'installAreas.0.lengthMetersRaw', value: '１' });
  assert.equal(act(state, 'calculate').error.code, 'invalid_number');
});
test('state: both language reports and error/confirmation messages are complete', () => {
  assert.ok(filled('zh-Hant').report.startsWith('鋪材用量試算')); assert.ok(filled('en').report.startsWith('Tile and Panel'));
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-Hant']).sort());
  assert.deepEqual(Object.keys(messages.en.errors).sort(), Object.keys(messages['zh-Hant'].errors).sort());
  for (const copy of Object.values(messages)) for (const message of Object.values(copy.errors)) assert.ok(typeof message === 'string' && message.length > 0);
});
