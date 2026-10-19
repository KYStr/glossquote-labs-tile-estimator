import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTileEstimate as calculate } from '../public/js/core/tile-estimator.mjs';

const row = (id = 'area-1', length = '3', width = '4', name = '') => ({ id, nameRaw: name, lengthMetersRaw: length, widthMetersRaw: width });
const r0 = () => ({ installAreas: [row()], deductionAreas: [], tileLengthCmRaw: '60', tileWidthCmRaw: '60', boxPiecesRaw: '4', reservePercentRaw: '10' });
const error = (code, field) => ({ ok: false, error: { code, field } });
function totals(request, expected) {
  const output = calculate(request);
  assert.equal(output.ok, true);
  for (const [key, value] of Object.entries(expected)) assert.equal(output.result.totals[key], value, key);
  return output.result;
}

test('C01: R0 exact closed schema, values and property order', () => {
  const expected = {
    ok: true,
    result: {
      schemaVersion: 1,
      installAreas: [{ name: '', lengthMm: '3000', widthMm: '4000', areaMm2: '12000000', areaM2Display: '12.00' }],
      deductionAreas: [],
      tile: { lengthMm: '600', widthMm: '600', areaMm2: '360000', areaM2Display: '0.36' },
      reservePercentTenths: '100', boxPieces: '4',
      totals: {
        installAreaMm2: '12000000', installAreaM2Display: '12.00', deductionAreaMm2: '0', deductionAreaM2Display: '0.00', netAreaMm2: '12000000', netAreaM2Display: '12.00',
        basePieces: '34', piecesWithReserve: '37', boxes: '10', purchasedPieces: '40', extraAfterReserve: '3', purchasedAreaMm2: '14400000', purchasedAreaM2Display: '14.40',
      },
    },
  };
  assert.deepEqual(calculate(r0()), expected);
  assert.equal(JSON.stringify(calculate(r0())), JSON.stringify(expected));
});

test('C02: subtract bathroom before reserve and full-box rounding', () => totals({ ...r0(), deductionAreas: [row('ded-1', '1', '2', '浴室')] }, { deductionAreaMm2: '2000000', netAreaMm2: '10000000', basePieces: '28', piecesWithReserve: '31', boxes: '8', purchasedPieces: '32', extraAfterReserve: '1', purchasedAreaMm2: '11520000', purchasedAreaM2Display: '11.52' }));
test('C03: zero reserve', () => totals({ ...r0(), reservePercentRaw: '0' }, { basePieces: '34', piecesWithReserve: '34', boxes: '9', purchasedPieces: '36', extraAfterReserve: '2', purchasedAreaMm2: '12960000' }));
test('C04: exact single-piece boundary', () => totals({ ...r0(), installAreas: [row('area-1', '0.6', '0.6')], reservePercentRaw: '0', boxPiecesRaw: '3' }, { netAreaMm2: '360000', basePieces: '1', piecesWithReserve: '1', boxes: '1', purchasedPieces: '3', extraAfterReserve: '2', purchasedAreaMm2: '1080000' }));
test('C05: exact tiny areas determine counts despite 0.00 displays', () => {
  const result = totals({ ...r0(), installAreas: [row('area-1', '0.001', '1.001')], tileLengthCmRaw: '0.1', tileWidthCmRaw: '100', reservePercentRaw: '0', boxPiecesRaw: '1' }, { netAreaMm2: '1001', netAreaM2Display: '0.00', basePieces: '2', piecesWithReserve: '2', boxes: '2', purchasedPieces: '2' });
  assert.equal(result.tile.areaMm2, '1000'); assert.equal(result.tile.areaM2Display, '0.00');
});
test('C06: reserve applied to exact area before rounding, fractional percent', () => {
  const result = totals({ ...r0(), installAreas: [row('area-1', '0.6', '0.6')], reservePercentRaw: '10.1', boxPiecesRaw: '2' }, { basePieces: '1', piecesWithReserve: '2', boxes: '1', purchasedPieces: '2', extraAfterReserve: '0' });
  assert.equal(result.reservePercentTenths, '101');
});
test('C07: minimum positive dimensions equal 1 mm²', () => totals({ ...r0(), installAreas: [row('area-1', '0.001', '0.001')], tileLengthCmRaw: '0.1', tileWidthCmRaw: '0.1', reservePercentRaw: '0', boxPiecesRaw: '1' }, { netAreaMm2: '1', basePieces: '1', piecesWithReserve: '1', boxes: '1', purchasedPieces: '1' }));
test('C08–C09: maximum dimensions, zero and fifty percent reserve', () => {
  const request = { ...r0(), installAreas: [row('area-1', '1000', '1000')], tileLengthCmRaw: '1000', tileWidthCmRaw: '1000', reservePercentRaw: '0', boxPiecesRaw: '1000' };
  const a = totals(request, { netAreaMm2: '1000000000000', basePieces: '10000', piecesWithReserve: '10000', boxes: '10', purchasedPieces: '10000', extraAfterReserve: '0' });
  assert.equal(a.tile.areaMm2, '100000000');
  const b = totals({ ...request, reservePercentRaw: '50' }, { piecesWithReserve: '15000', boxes: '15', purchasedPieces: '15000', extraAfterReserve: '0', purchasedAreaMm2: '1500000000000' });
  assert.equal(b.reservePercentTenths, '500');
});
test('C10: sum multiple installed rectangles without reordering', () => {
  const result = totals({ ...r0(), installAreas: [row('a', '3', '4', 'First'), row('b', '1', '2', 'Second')], reservePercentRaw: '0' }, { installAreaMm2: '14000000', netAreaMm2: '14000000', basePieces: '39', piecesWithReserve: '39', boxes: '10', purchasedPieces: '40', extraAfterReserve: '1' });
  assert.deepEqual(result.installAreas.map(r => [r.name, r.areaMm2]), [['First', '12000000'], ['Second', '2000000']]);
});
test('C11: repeated dimensions with distinct IDs are distinct deductions', () => totals({ ...r0(), deductionAreas: [row('d1', '1', '2'), row('d2', '1', '2')], reservePercentRaw: '0' }, { installAreaMm2: '12000000', deductionAreaMm2: '4000000', netAreaMm2: '8000000', basePieces: '23', piecesWithReserve: '23', boxes: '6', purchasedPieces: '24', extraAfterReserve: '1', purchasedAreaMm2: '8640000' }));
test('C12: twenty plus twenty rows retained in order', () => {
  const request = { ...r0(), installAreas: Array.from({ length: 20 }, (_, i) => row(`area-${String(i + 1).padStart(2, '0')}`, '1', '1', `A${i}`)), deductionAreas: Array.from({ length: 20 }, (_, i) => row(`ded-${String(i + 1).padStart(2, '0')}`, '0.5', '0.5', `D${i}`)), tileLengthCmRaw: '100', tileWidthCmRaw: '100', reservePercentRaw: '0', boxPiecesRaw: '10' };
  const result = totals(request, { installAreaMm2: '20000000', deductionAreaMm2: '5000000', netAreaMm2: '15000000', basePieces: '15', piecesWithReserve: '15', boxes: '2', purchasedPieces: '20', extraAfterReserve: '5' });
  for (const key of ['installAreas', 'deductionAreas']) assert.deepEqual(result[key].map(r => r.name), request[key].map(r => r.nameRaw));
});
test('C13–C15: bounded row counts reject entire request', () => {
  assert.deepEqual(calculate({ ...r0(), installAreas: [] }), error('row_count', 'installAreas'));
  for (const key of ['installAreas', 'deductionAreas']) assert.deepEqual(calculate({ ...r0(), [key]: Array.from({ length: 21 }, (_, i) => row(`x${i}`, '1', '1')) }), error('row_count', key));
});
test('C16–C17: equal or larger deduction rejected', () => {
  for (const length of ['3', '4']) assert.deepEqual(calculate({ ...r0(), deductionAreas: [row('ded', length, '4')] }), error('non_positive_net_area', 'deductionAreas'));
});
test('C18: global ID uniqueness and ASCII format', () => {
  assert.deepEqual(calculate({ ...r0(), deductionAreas: [row()] }), error('duplicate_id', 'deductionAreas.0.id'));
  for (const id of ['', ' space', 'é', 'x'.repeat(41)]) assert.deepEqual(calculate({ ...r0(), installAreas: [row(id)] }), error('invalid_id', 'installAreas.0.id'));
});
test('C19: absent/trimmed empty names remain empty; Unicode counts code points', () => {
  for (const name of ['', '   ', '\u00a0  \u00a0']) assert.equal(calculate({ ...r0(), installAreas: [row('a', '3', '4', name)] }).result.installAreas[0].name, '');
  const request = r0(); delete request.installAreas[0].nameRaw; assert.equal(calculate(request).result.installAreas[0].name, '');
  for (const name of ['é'.repeat(40), '😀'.repeat(40)]) assert.equal(calculate({ ...r0(), installAreas: [row('a', '3', '4', name)] }).result.installAreas[0].name, name);
});
test('C20: name bounds and invalid Unicode reject without rewriting', () => {
  for (const [name, code] of [['é'.repeat(41), 'invalid_name'], [' '.repeat(257), 'invalid_name'], ['A\n', 'invalid_unicode'], ['A\u0085', 'invalid_unicode'], [String.fromCharCode(0xd800), 'invalid_unicode'], [String.fromCharCode(0xdc00), 'invalid_unicode']]) assert.deepEqual(calculate({ ...r0(), installAreas: [row('a', '3', '4', name)] }), error(code, 'installAreas.0.nameRaw'));
});
test('C21: strict numeric syntax and ASCII outer whitespace only', () => {
  assert.equal(calculate({ ...r0(), installAreas: [row('a', ' \t1.25 ', '4')] }).result.installAreas[0].lengthMm, '1250');
  for (const raw of ['-1', '+1', '1e3', '1,000', '１', 'Infinity', 'NaN', '1 0', '.5', '1.', '', '.', '\u00a01', '1\u00a0', '1．5']) assert.deepEqual(calculate({ ...r0(), installAreas: [row('a', raw)] }), error('invalid_number', 'installAreas.0.lengthMetersRaw'));
});
test('C22: numeric precision has its own error', () => {
  assert.equal(calculate({ ...r0(), installAreas: [row('a', '1.234')] }).result.installAreas[0].lengthMm, '1234');
  assert.deepEqual(calculate({ ...r0(), installAreas: [row('a', '1.2345')] }), error('precision_exceeded', 'installAreas.0.lengthMetersRaw'));
  assert.equal(calculate({ ...r0(), tileLengthCmRaw: '60.1' }).result.tile.lengthMm, '601');
  assert.deepEqual(calculate({ ...r0(), tileLengthCmRaw: '60.12' }), error('precision_exceeded', 'tileLengthCmRaw'));
});
test('C23–C24: exact dimension, reserve and box boundaries', () => {
  for (const [field, allowed, rejected] of [['tileWidthCmRaw', ['0.1', '1000'], ['0', '1000.1']], ['reservePercentRaw', ['0', '50'], ['50.1']], ['boxPiecesRaw', ['1', '1000'], ['0', '1001']]]) {
    for (const raw of allowed) assert.equal(calculate({ ...r0(), [field]: raw }).ok, true);
    for (const raw of rejected) assert.deepEqual(calculate({ ...r0(), [field]: raw }), error('out_of_range', field));
  }
  for (const raw of ['0', '1000.001']) assert.deepEqual(calculate({ ...r0(), installAreas: [row('a', raw)] }), error('out_of_range', 'installAreas.0.lengthMetersRaw'));
  assert.equal(calculate({ ...r0(), installAreas: [row('a', '1000')] }).ok, true);
  assert.deepEqual(calculate({ ...r0(), boxPiecesRaw: '1.0' }), error('invalid_number', 'boxPiecesRaw'));
});
test('C25: raw length includes whitespace, accepts leading zeros', () => {
  assert.equal(calculate({ ...r0(), installAreas: [row('a', '0'.repeat(31) + '1')] }).result.installAreas[0].lengthMm, '1000');
  for (const raw of ['0'.repeat(32) + '1', ' '.repeat(32) + '1']) assert.deepEqual(calculate({ ...r0(), installAreas: [row('a', raw)] }), error('input_too_long', 'installAreas.0.lengthMetersRaw'));
});
test('C26: unknown root keys and getters never echoed or executed', () => {
  const sensitiveKey = 'token_dump_user_secret_' + 'x'.repeat(1000);
  let calls = 0;
  const request = r0(); Object.defineProperty(request, sensitiveKey, { enumerable: true, get() { calls += 1; return 'fake-secret'; } });
  assert.deepEqual(calculate(request), error('invalid_request', 'request'));
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(calculate(request)).includes('secret'), false);
  const knownGetter = r0(); Object.defineProperty(knownGetter, 'tileLengthCmRaw', { enumerable: true, get() { calls += 1; return '60'; } });
  assert.deepEqual(calculate(knownGetter), error('invalid_request', 'request')); assert.equal(calls, 0);
});
test('C27: exact schemas, descriptor priority, arrays and known missing fields', () => {
  let calls = 0;
  const access = row(); delete access.lengthMetersRaw; Object.defineProperty(access, 'secret', { enumerable: true, get() { calls += 1; return 'fake'; } });
  assert.deepEqual(calculate({ ...r0(), installAreas: [access] }), error('invalid_row', 'installAreas.0'));
  const missing = row(); delete missing.lengthMetersRaw;
  assert.deepEqual(calculate({ ...r0(), installAreas: [missing] }), error('invalid_type', 'installAreas.0.lengthMetersRaw'));
  for (const make of [r => { r[Symbol('x')] = 'fake'; }, r => Object.defineProperty(r, 'extra', { value: 'fake' }), r => Object.setPrototypeOf(r, null)]) { const request = r0(); make(request); assert.deepEqual(calculate(request), error('invalid_request', 'request')); }
  for (const make of [a => { delete a[0]; }, a => { a.extra = 'fake'; }, a => { a[Symbol('x')] = 'fake'; }, a => Object.defineProperty(a, '0', { enumerable: true, get() { calls += 1; return row(); } })]) { const request = r0(); make(request.installAreas); assert.deepEqual(calculate(request), error('invalid_rows', 'installAreas')); }
  const missingRoot = r0(); delete missingRoot.tileLengthCmRaw; assert.deepEqual(calculate(missingRoot), error('invalid_type', 'request.tileLengthCmRaw'));
  assert.deepEqual(calculate({ ...r0(), tileLengthCmRaw: 60 }), error('invalid_type', 'tileLengthCmRaw'));
  for (const field of ['id', 'lengthMetersRaw', 'widthMetersRaw', 'nameRaw']) assert.deepEqual(calculate({ ...r0(), installAreas: [{ ...row(), [field]: null }] }), error('invalid_type', `installAreas.0.${field}`));
  assert.equal(calls, 0);
});
test('C28: deeply frozen input and its descriptors/order remain unchanged', () => {
  const request = r0(); Object.freeze(request.installAreas[0]); Object.freeze(request.installAreas); Object.freeze(request.deductionAreas); Object.freeze(request);
  const before = JSON.stringify(request); const descriptors = Object.getOwnPropertyDescriptors(request.installAreas[0]);
  assert.equal(calculate(request).ok, true); assert.equal(JSON.stringify(request), before); assert.deepEqual(Object.getOwnPropertyDescriptors(request.installAreas[0]), descriptors);
});
test('C29: hostile-looking names are retained as plain text by core', () => {
  const text = '<img src=x onerror=alert(1)>';
  assert.equal(calculate({ ...r0(), installAreas: [row('a', '3', '4', text)] }).result.installAreas[0].name, text);
});
test('positive half-up display boundary is independent of quantity arithmetic', () => {
  for (const [width, display] of [['4.999', '0.00'], ['5', '0.01'], ['15', '0.02']]) assert.equal(calculate({ ...r0(), installAreas: [row('a', '0.001', width)] }).result.totals.netAreaM2Display, display);
});
test('maximum aggregate, smallest tile and reserve retain integer precision', () => totals({ ...r0(), installAreas: Array.from({ length: 20 }, (_, i) => row(`a${i}`, '1000', '1000')), tileLengthCmRaw: '0.1', tileWidthCmRaw: '0.1', boxPiecesRaw: '999', reservePercentRaw: '50' }, { netAreaMm2: '20000000000000', basePieces: '20000000000000', piecesWithReserve: '30000000000000', boxes: '30030030031', purchasedPieces: '30000000000969', extraAfterReserve: '969', purchasedAreaMm2: '30000000000969' }));
test('fixed generated inputs satisfy independent lower/upper coverage inequalities', () => {
  for (let i = 1; i <= 80; i += 1) {
    const result = calculate({ ...r0(), installAreas: [row('a', `0.${String(i).padStart(3, '0')}`, String(i))], tileLengthCmRaw: `${i}.1`, tileWidthCmRaw: '0.7', reservePercentRaw: `${i % 51}`, boxPiecesRaw: `${i + 1}` }).result;
    const a = BigInt(result.totals.netAreaMm2), t = BigInt(result.tile.areaMm2), p = BigInt(result.totals.piecesWithReserve), b = BigInt(result.totals.boxes), q = BigInt(result.boxPieces), r = BigInt(result.reservePercentTenths);
    assert.ok(p * 1000n * t >= a * (1000n + r)); assert.ok((p - 1n) * 1000n * t < a * (1000n + r));
    assert.ok(b * q >= p); assert.ok((b - 1n) * q < p); assert.ok(BigInt(result.totals.extraAfterReserve) < q);
  }
});

test('C33: oversized ordinary sparse arrays are rejected before enumeration or index getters', t => {
  const oversized = new Set();
  let getterCalls = 0;
  let enumerationCalls = 0;
  const descriptors = Object.getOwnPropertyDescriptors;
  const keys = Reflect.ownKeys;
  t.mock.method(Object, 'getOwnPropertyDescriptors', value => {
    if (oversized.has(value)) { enumerationCalls += 1; throw new Error('Oversized array enumeration'); }
    return descriptors(value);
  });
  t.mock.method(Reflect, 'ownKeys', value => {
    if (oversized.has(value)) { enumerationCalls += 1; throw new Error('Oversized array enumeration'); }
    return keys(value);
  });
  for (const group of ['installAreas', 'deductionAreas']) {
    for (const length of [21, 0xffffffff]) {
      const rows = new Array(length);
      Object.defineProperty(rows, '0', { enumerable: true, get() { getterCalls += 1; return row(); } });
      rows.extra = 'fake-private-value';
      rows[Symbol('unknown')] = 'fake-private-value';
      oversized.add(rows);
      assert.deepEqual(calculate({ ...r0(), [group]: rows }), error('row_count', group));
    }
  }
  assert.equal(getterCalls, 0);
  assert.equal(enumerationCalls, 0);
});

test('C33: length rejection precedes same/later-array structure and row errors', () => {
  const oversized = () => new Array(21);
  assert.deepEqual(calculate({ ...r0(), installAreas: oversized(), deductionAreas: null }), error('row_count', 'installAreas'));
  assert.deepEqual(calculate({ ...r0(), installAreas: oversized(), deductionAreas: oversized() }), error('row_count', 'installAreas'));
  const invalidRow = row(); delete invalidRow.widthMetersRaw;
  assert.deepEqual(calculate({ ...r0(), installAreas: [invalidRow], deductionAreas: oversized() }), error('row_count', 'deductionAreas'));
  const malformedEarlier = [row()]; malformedEarlier.extra = true;
  assert.deepEqual(calculate({ ...r0(), installAreas: malformedEarlier, deductionAreas: oversized() }), error('invalid_rows', 'installAreas'));
  const wrongPrototype = oversized(); Object.setPrototypeOf(wrongPrototype, null);
  assert.deepEqual(calculate({ ...r0(), installAreas: wrongPrototype }), error('invalid_rows', 'installAreas'));
  assert.deepEqual(calculate({ ...r0(), installAreas: oversized(), unknown: true }), error('invalid_request', 'request'));
  const missingRoot = { ...r0(), installAreas: oversized() }; delete missingRoot.tileLengthCmRaw;
  assert.deepEqual(calculate(missingRoot), error('invalid_type', 'request.tileLengthCmRaw'));
});

test('C35: twenty-plus-twenty rows retain full last-row schema validation', () => {
  const make = () => ({
    ...r0(),
    installAreas: Array.from({ length: 20 }, (_, i) => row(`a${i}`, '1', '1', 'é'.repeat(40))),
    deductionAreas: Array.from({ length: 20 }, (_, i) => row(`d${i}`, '0.5', '0.5', '😀'.repeat(40))),
    tileLengthCmRaw: '100', tileWidthCmRaw: '100', reservePercentRaw: '0', boxPiecesRaw: '10',
  });
  const valid = totals(make(), { installAreaMm2: '20000000', deductionAreaMm2: '5000000', netAreaMm2: '15000000', piecesWithReserve: '15', boxes: '2', purchasedPieces: '20', extraAfterReserve: '5' });
  assert.equal(valid.installAreas.length, 20); assert.equal(valid.deductionAreas.length, 20);
  assert.equal(valid.installAreas[19].name, 'é'.repeat(40)); assert.equal(valid.deductionAreas[19].name, '😀'.repeat(40));
  let getterCalls = 0;
  for (const group of ['installAreas', 'deductionAreas']) {
    const unknown = make(); unknown[group][19].fake_secret = true;
    assert.deepEqual(calculate(unknown), error('invalid_row', `${group}.19`));
    const accessor = make(); Object.defineProperty(accessor[group][19], 'nameRaw', { enumerable: true, get() { getterCalls += 1; return ''; } });
    assert.deepEqual(calculate(accessor), error('invalid_row', `${group}.19`));
    const missing = make(); delete missing[group][19].widthMetersRaw;
    assert.deepEqual(calculate(missing), error('invalid_type', `${group}.19.widthMetersRaw`));
    const indexGetter = make(); Object.defineProperty(indexGetter[group], '19', { enumerable: true, get() { getterCalls += 1; return row(); } });
    assert.deepEqual(calculate(indexGetter), error('invalid_rows', group));
  }
  assert.equal(getterCalls, 0);
});

test('C35: within-limit array structure still precedes lower count and row validation', () => {
  assert.deepEqual(calculate({ ...r0(), installAreas: [], deductionAreas: null }), error('invalid_rows', 'deductionAreas'));
  const invalidRow = row(); delete invalidRow.widthMetersRaw;
  const malformedDeduction = []; malformedDeduction.extra = true;
  assert.deepEqual(calculate({ ...r0(), installAreas: [invalidRow], deductionAreas: malformedDeduction }), error('invalid_rows', 'deductionAreas'));
  assert.deepEqual(calculate({ ...r0(), installAreas: new Array(20) }), error('invalid_rows', 'installAreas'));
});
