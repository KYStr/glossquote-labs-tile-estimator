import { record, arrayLength, denseArray, failure, requestKeys, rowKeys, nameError, parseDecimal, makeArea, makeResult } from './schema.mjs';

export function calculateTileEstimate(request) {
  try { return calculate(request); }
  catch { return failure('invalid_request', 'request'); }
}

function calculate(request) {
  const root = record(request, requestKeys);
  if (!root) return failure('invalid_request', 'request');
  for (const key of requestKeys) if (!Object.hasOwn(root, key)) return failure('invalid_type', `request.${key}`);
  const arrays = {};
  for (const key of ['installAreas', 'deductionAreas']) {
    const length = arrayLength(root[key].value);
    if (length === null) return failure('invalid_rows', key);
    if (length > 20) return failure('row_count', key);
    arrays[key] = denseArray(root[key].value);
    if (!arrays[key]) return failure('invalid_rows', key);
  }
  for (const key of ['installAreas', 'deductionAreas']) {
    if (key === 'installAreas' && arrays[key].length < 1) return failure('row_count', key);
  }
  const ids = new Set();
  const normalized = { installAreas: [], deductionAreas: [] };
  for (const key of ['installAreas', 'deductionAreas']) {
    for (const [index, row] of arrays[key].entries()) {
      const rowPath = `${key}.${index}`;
      const data = record(row, rowKeys);
      if (!data) return failure('invalid_row', rowPath);
      for (const field of ['id', 'lengthMetersRaw', 'widthMetersRaw']) if (!Object.hasOwn(data, field)) return failure('invalid_type', `${rowPath}.${field}`);
      for (const field of rowKeys) if (Object.hasOwn(data, field) && typeof data[field].value !== 'string') return failure('invalid_type', `${rowPath}.${field}`);
      const id = data.id.value;
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return failure('invalid_id', `${rowPath}.id`);
      if (ids.has(id)) return failure('duplicate_id', `${rowPath}.id`);
      ids.add(id);
      const rawName = data.nameRaw?.value ?? '';
      const invalidName = nameError(rawName);
      if (invalidName) return failure(invalidName, `${rowPath}.nameRaw`);
      const length = parseDecimal(data.lengthMetersRaw.value, 3, 1n, 1000000n);
      if (length.code) return failure(length.code, `${rowPath}.lengthMetersRaw`);
      const width = parseDecimal(data.widthMetersRaw.value, 3, 1n, 1000000n);
      if (width.code) return failure(width.code, `${rowPath}.widthMetersRaw`);
      normalized[key].push(makeArea(rawName.trim(), length.value, width.value));
    }
  }
  const values = {};
  const settings = [
    ['tileLengthCmRaw', 1, 1n, 10000n], ['tileWidthCmRaw', 1, 1n, 10000n],
    ['boxPiecesRaw', 0, 1n, 1000n], ['reservePercentRaw', 1, 0n, 500n],
  ];
  for (const [field, precision, min, max] of settings) {
    const parsed = parseDecimal(root[field].value, precision, min, max);
    if (parsed.code) return failure(parsed.code, field);
    values[field] = parsed.value;
  }
  const sum = rows => rows.reduce((total, row) => total + BigInt(row.areaMm2), 0n);
  if (sum(normalized.deductionAreas) >= sum(normalized.installAreas)) return failure('non_positive_net_area', 'deductionAreas');
  return { ok: true, result: makeResult(normalized.installAreas, normalized.deductionAreas, values.tileLengthCmRaw, values.tileWidthCmRaw, values.boxPiecesRaw, values.reservePercentRaw) };
}
