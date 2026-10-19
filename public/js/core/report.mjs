import { record, arrayLength, denseArray, failure, nameError, makeArea, makeResult, formatScaled, resultKeys, resultRowKeys, tileKeys, totalKeys } from './schema.mjs';

function exactRecord(value, keys) {
  const descriptors = record(value, keys);
  return descriptors && keys.every(key => Object.hasOwn(descriptors, key)) ? descriptors : null;
}

function integer(value, min, max) {
  return typeof value === 'string' && value.length <= 16 && /^(?:0|[1-9][0-9]*)$/.test(value) && BigInt(value) >= min && BigInt(value) <= max;
}

function matches(descriptors, expected, keys) {
  return descriptors && keys.every(key => descriptors[key].value === expected[key]);
}

// Rebuild the full snapshot from dimensions and assumptions, then compare every
// derived field. Descriptor access never executes getters on the supplied result.
function validateResult(result) {
  const root = exactRecord(result, resultKeys);
  if (!root || root.schemaVersion.value !== 1) return null;
  const groups = {};
  for (const key of ['installAreas', 'deductionAreas']) {
    const length = arrayLength(root[key].value);
    if (length === null || length > 20) return null;
    const rows = denseArray(root[key].value);
    if (!rows || (key === 'installAreas' && rows.length < 1)) return null;
    groups[key] = [];
    for (const row of rows) {
      const fields = exactRecord(row, resultRowKeys);
      if (!fields) return null;
      const name = fields.name.value;
      if (nameError(name) || name !== name.trim() || !integer(fields.lengthMm.value, 1n, 1000000n) || !integer(fields.widthMm.value, 1n, 1000000n)) return null;
      const rebuilt = makeArea(name, BigInt(fields.lengthMm.value), BigInt(fields.widthMm.value));
      if (!matches(fields, rebuilt, resultRowKeys)) return null;
      groups[key].push(rebuilt);
    }
  }
  const tile = exactRecord(root.tile.value, tileKeys);
  if (!tile || !integer(tile.lengthMm.value, 1n, 10000n) || !integer(tile.widthMm.value, 1n, 10000n) || !integer(root.boxPieces.value, 1n, 1000n) || !integer(root.reservePercentTenths.value, 0n, 500n)) return null;
  const sum = rows => rows.reduce((value, row) => value + BigInt(row.areaMm2), 0n);
  if (sum(groups.installAreas) <= sum(groups.deductionAreas)) return null;
  const rebuilt = makeResult(groups.installAreas, groups.deductionAreas, BigInt(tile.lengthMm.value), BigInt(tile.widthMm.value), BigInt(root.boxPieces.value), BigInt(root.reservePercentTenths.value));
  if (!matches(tile, rebuilt.tile, tileKeys) || !matches(exactRecord(root.totals.value, totalKeys), rebuilt.totals, totalKeys)) return null;
  return rebuilt;
}

export const areaName = (name, index, language) => name || (language === 'en' ? `Area ${index + 1}` : `區域 ${index + 1}`);
const quotedName = (name, index, language) => JSON.stringify(areaName(name, index, language)).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const areaZh = (display, exact) => `${display} m²（精確 ${exact} mm²）`;
const areaEn = (display, exact) => `${display} m² (exact ${exact} mm²)`;

export function buildReport(result, language) {
  if (language !== 'zh-Hant' && language !== 'en') return failure('unsupported_language', 'language');
  try {
    const snapshot = validateResult(result);
    if (!snapshot) return failure('invalid_result', 'result');
    const { installAreas, deductionAreas, tile, totals: t } = snapshot;
    const reserve = formatScaled(snapshot.reservePercentTenths, 1);
    const dimensions = `${formatScaled(tile.lengthMm, 1)} cm × ${formatScaled(tile.widthMm, 1)} cm`;
    const lines = [];
    const rows = (areas, heading, empty) => {
      lines.push(areas.length ? heading : empty);
      areas.forEach((row, index) => lines.push(language === 'en'
        ? `- ${quotedName(row.name, index, language)} | ${formatScaled(row.lengthMm, 3)} m × ${formatScaled(row.widthMm, 3)} m | ${areaEn(row.areaM2Display, row.areaMm2)}`
        : `- ${quotedName(row.name, index, language)}｜${formatScaled(row.lengthMm, 3)} m × ${formatScaled(row.widthMm, 3)} m｜${areaZh(row.areaM2Display, row.areaMm2)}`));
    };
    if (language === 'en') {
      lines.push('Tile and Panel Usage Estimate (area estimate, not installation advice)');
      rows(installAreas, 'Installed areas:', 'Installed areas: none');
      rows(deductionAreas, 'Deducted areas:', 'Deducted areas: none');
      lines.push(
        `Installed area total: ${areaEn(t.installAreaM2Display, t.installAreaMm2)}`,
        `Deducted area total: ${areaEn(t.deductionAreaM2Display, t.deductionAreaMm2)}`,
        `Net area: ${areaEn(t.netAreaM2Display, t.netAreaMm2)}`,
        `Material size: ${dimensions} | one piece ${areaEn(tile.areaM2Display, tile.areaMm2)}`,
        `Reserve assumption: ${reserve}% (editable; not a universal recommendation)`,
        `Base estimate: ${t.basePieces} tiles`, `Estimate with reserve: ${t.piecesWithReserve} tiles`, `Pieces per box: ${snapshot.boxPieces}`,
        `Boxes: ${t.boxes} (${t.purchasedPieces} tiles purchased)`, `Extra pieces after reserve: ${t.extraAfterReserve}`,
        `Area purchased in full boxes: ${areaEn(t.purchasedAreaM2Display, t.purchasedAreaMm2)}`,
        'Area is summed by rectangle only; no layout or cutting plan is provided, and results do not guarantee a pattern or installation outcome.',
        'Areas are displayed to two decimals; piece and box counts use exact mm².',
      );
    } else {
      lines.push('鋪材用量試算（磁磚／板材面積估算，非施工建議）');
      rows(installAreas, '鋪設區域：', '鋪設區域：無');
      rows(deductionAreas, '扣除區域：', '扣除區域：無');
      lines.push(
        `鋪設總面積：${areaZh(t.installAreaM2Display, t.installAreaMm2)}`,
        `扣除總面積：${areaZh(t.deductionAreaM2Display, t.deductionAreaMm2)}`,
        `淨面積：${areaZh(t.netAreaM2Display, t.netAreaMm2)}`,
        `鋪材尺寸：${dimensions}｜單片 ${areaZh(tile.areaM2Display, tile.areaMm2)}`,
        `備料假設：${reserve}%（可自行調整，非通用建議）`,
        `基本估算：${t.basePieces} 片`, `含備料估算：${t.piecesWithReserve} 片`, `每箱片數：${snapshot.boxPieces}`,
        `整箱數：${t.boxes} 箱（購買 ${t.purchasedPieces} 片）`, `整箱餘片：${t.extraAfterReserve} 片`,
        `整箱購買面積：${areaZh(t.purchasedAreaM2Display, t.purchasedAreaMm2)}`,
        '面積只依矩形面積加總；不排版、不估切割，亦不保證拼花或實際施工結果。',
        '面積顯示至小數第 2 位；片數與箱數依精確 mm² 計算。',
      );
    }
    const text = lines.join('\n');
    return text.length > 32768 ? failure('report_too_large', 'result') : { ok: true, text };
  } catch { return failure('invalid_result', 'result'); }
}
