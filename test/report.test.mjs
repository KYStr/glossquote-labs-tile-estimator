import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTileEstimate } from '../public/js/core/tile-estimator.mjs';
import { buildReport } from '../public/js/core/report.mjs';

const request = () => ({ installAreas: [{ id: 'area-1', nameRaw: '', lengthMetersRaw: '3', widthMetersRaw: '4' }], deductionAreas: [], tileLengthCmRaw: '60', tileWidthCmRaw: '60', boxPiecesRaw: '4', reservePercentRaw: '10' });
const result = () => calculateTileEstimate(request()).result;
const invalid = { ok: false, error: { code: 'invalid_result', field: 'result' } };
const zh = `鋪材用量試算（磁磚／板材面積估算，非施工建議）
鋪設區域：
- "區域 1"｜3.000 m × 4.000 m｜12.00 m²（精確 12000000 mm²）
扣除區域：無
鋪設總面積：12.00 m²（精確 12000000 mm²）
扣除總面積：0.00 m²（精確 0 mm²）
淨面積：12.00 m²（精確 12000000 mm²）
鋪材尺寸：60.0 cm × 60.0 cm｜單片 0.36 m²（精確 360000 mm²）
備料假設：10.0%（可自行調整，非通用建議）
基本估算：34 片
含備料估算：37 片
每箱片數：4
整箱數：10 箱（購買 40 片）
整箱餘片：3 片
整箱購買面積：14.40 m²（精確 14400000 mm²）
面積只依矩形面積加總；不排版、不估切割，亦不保證拼花或實際施工結果。
面積顯示至小數第 2 位；片數與箱數依精確 mm² 計算。`;
const en = `Tile and Panel Usage Estimate (area estimate, not installation advice)
Installed areas:
- "Area 1" | 3.000 m × 4.000 m | 12.00 m² (exact 12000000 mm²)
Deducted areas: none
Installed area total: 12.00 m² (exact 12000000 mm²)
Deducted area total: 0.00 m² (exact 0 mm²)
Net area: 12.00 m² (exact 12000000 mm²)
Material size: 60.0 cm × 60.0 cm | one piece 0.36 m² (exact 360000 mm²)
Reserve assumption: 10.0% (editable; not a universal recommendation)
Base estimate: 34 tiles
Estimate with reserve: 37 tiles
Pieces per box: 4
Boxes: 10 (40 tiles purchased)
Extra pieces after reserve: 3
Area purchased in full boxes: 14.40 m² (exact 14400000 mm²)
Area is summed by rectangle only; no layout or cutting plan is provided, and results do not guarantee a pattern or installation outcome.
Areas are displayed to two decimals; piece and box counts use exact mm².`;

test('C30: both report languages match the complete fixed contract character for character', () => {
  for (const [language, expected] of [['zh-Hant', zh], ['en', en]]) {
    const actual = buildReport(result(), language);
    assert.deepEqual(actual, { ok: true, text: expected });
    assert.equal(typeof actual.text, 'string'); assert.equal(actual.text.includes('\r'), false); assert.equal(actual.text.endsWith('\n'), false); assert.equal(actual.text.charCodeAt(0) === 0xfeff, false);
  }
});
test('C30: stale or forged derived values never yield partial report text', () => {
  const changed = result(); changed.totals.basePieces = '35'; assert.deepEqual(buildReport(changed, 'en'), invalid);
  for (const key of Object.keys(result().totals)) { const changed = result(); changed.totals[key] = '99999'; assert.deepEqual(buildReport(changed, 'en'), invalid, key); }
});
test('C31: closed result schema rejects unknown keys, getters, symbols, descriptors and holes', () => {
  let calls = 0;
  const variants = [
    r => { r.fake_secret = 'not-a-real-secret'; },
    r => Object.defineProperty(r, 'totals', { enumerable: true, get() { calls += 1; return {}; } }),
    r => { delete r.installAreas[0]; }, r => { r.installAreas.extra = true; },
    r => { r[Symbol('x')] = true; }, r => Object.defineProperty(r.tile, 'areaMm2', { value: '360000', enumerable: false }),
    r => { r.tile.areaM2Display = '0.35'; }, r => { r.totals.netAreaMm2 = '11999999'; },
    r => { r.installAreas[0].name = ' padded '; }, r => { r.installAreas[0].name = '\ud800'; },
    r => { r.boxPieces = '04'; }, r => { r.reservePercentTenths = '501'; },
    r => { r.installAreas[0].lengthMm = '0003000'; }, r => { r.tile.lengthMm = '10001'; },
    r => { delete r.schemaVersion; }, r => { r.installAreas[0].id = 'unexpected'; },
    r => Object.setPrototypeOf(r.totals, null), r => Object.defineProperty(r.installAreas[0], 'name', { enumerable: true, get() { calls += 1; return ''; } }),
  ];
  for (const variant of variants) { const r = result(); variant(r); assert.deepEqual(buildReport(r, 'en'), invalid); }
  assert.equal(calls, 0);
});
test('C31: largest legal row/name combination produces a bounded Unicode report', () => {
  const req = request();
  req.installAreas = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, nameRaw: '😀'.repeat(40), lengthMetersRaw: '1000', widthMetersRaw: '1000' }));
  req.deductionAreas = Array.from({ length: 20 }, (_, i) => ({ id: `d${i}`, nameRaw: '😀'.repeat(40), lengthMetersRaw: '0.001', widthMetersRaw: '0.001' }));
  req.tileLengthCmRaw = req.tileWidthCmRaw = '0.1'; req.boxPiecesRaw = '999'; req.reservePercentRaw = '50';
  for (const language of ['zh-Hant', 'en']) { const report = buildReport(calculateTileEstimate(req).result, language); assert.equal(report.ok, true); assert.ok(report.text.length < 32768); assert.equal(report.text.split('\n').filter(line => line.startsWith('- ')).length, 40); }
});
test('C19/C29: localized fallback stays outside core, names JSON-escape delimiters and separators', () => {
  const req = request(); req.installAreas[0].nameRaw = '<img src=x onerror=alert(1)>';
  const r = calculateTileEstimate(req).result; assert.ok(buildReport(r, 'en').text.includes(JSON.stringify(req.installAreas[0].nameRaw)));
  req.installAreas[0].nameRaw = 'A"\\B\u2028C\u2029D';
  const report = buildReport(calculateTileEstimate(req).result, 'en').text;
  assert.ok(report.includes('"A\\"\\\\B\\u2028C\\u2029D"')); assert.equal(report.includes('\u2028'), false); assert.equal(report.includes('\u2029'), false);
  const empty = result(); buildReport(empty, 'en'); buildReport(empty, 'zh-Hant'); assert.equal(empty.installAreas[0].name, '');
});
test('deduction rows have independent localized positional names and fixed ordering', () => {
  const req = request(); req.deductionAreas = [{ ...req.installAreas[0], id: 'ded', lengthMetersRaw: '1', widthMetersRaw: '2' }];
  assert.ok(buildReport(calculateTileEstimate(req).result, 'en').text.includes('Deducted areas:\n- "Area 1" | 1.000 m × 2.000 m | 2.00 m² (exact 2000000 mm²)'));
});
test('unsupported report language uses a stable error and frozen result is unchanged', () => {
  assert.deepEqual(buildReport(result(), 'en-US'), { ok: false, error: { code: 'unsupported_language', field: 'language' } });
  const r = result(); Object.freeze(r.installAreas[0]); Object.freeze(r.installAreas); Object.freeze(r.deductionAreas); Object.freeze(r.tile); Object.freeze(r.totals); Object.freeze(r);
  const before = JSON.stringify(r); assert.equal(buildReport(r, 'en').ok, true); assert.equal(JSON.stringify(r), before);
});

test('C34: both languages reject oversized result arrays before enumeration and getters', t => {
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
      Object.defineProperty(rows, '0', { enumerable: true, get() { getterCalls += 1; return {}; } });
      rows.extra = true; rows[Symbol('unknown')] = true;
      oversized.add(rows);
      for (const language of ['zh-Hant', 'en']) {
        const snapshot = result(); snapshot[group] = rows;
        assert.deepEqual(buildReport(snapshot, language), invalid);
      }
    }
  }
  assert.equal(getterCalls, 0);
  assert.equal(enumerationCalls, 0);
});

test('C35: maximum legal rows/names still report fully and validate the last row', () => {
  const req = request();
  req.installAreas = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, nameRaw: '😀'.repeat(40), lengthMetersRaw: '1000', widthMetersRaw: '1000' }));
  req.deductionAreas = Array.from({ length: 20 }, (_, i) => ({ id: `d${i}`, nameRaw: 'é'.repeat(40), lengthMetersRaw: '0.001', widthMetersRaw: '0.001' }));
  const valid = calculateTileEstimate(req).result;
  for (const language of ['zh-Hant', 'en']) {
    const report = buildReport(valid, language);
    assert.equal(report.ok, true); assert.ok(report.text.length < 32768);
    assert.equal(report.text.split('\n').filter(line => line.startsWith('- ')).length, 40);
    assert.ok(report.text.includes(JSON.stringify('😀'.repeat(40)))); assert.ok(report.text.includes(JSON.stringify('é'.repeat(40))));
  }
  let getterCalls = 0;
  for (const group of ['installAreas', 'deductionAreas']) {
    for (const mutate of [
      row => { row.fake_secret = true; },
      row => Object.defineProperty(row, 'name', { enumerable: true, get() { getterCalls += 1; return ''; } }),
      row => { delete row.areaMm2; },
      row => { row.areaM2Display = '999999.99'; },
    ]) {
      const snapshot = structuredClone(valid); mutate(snapshot[group][19]);
      for (const language of ['zh-Hant', 'en']) assert.deepEqual(buildReport(snapshot, language), invalid);
    }
    const snapshot = structuredClone(valid); Object.defineProperty(snapshot[group], '19', { enumerable: true, get() { getterCalls += 1; return {}; } });
    assert.deepEqual(buildReport(snapshot, 'en'), invalid);
  }
  assert.equal(getterCalls, 0);
});
