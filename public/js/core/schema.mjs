// Reflect on descriptors before reading any caller-controlled value.
// Proxies are outside the JSON-like input contract; callers must not supply them.
export function record(value, allowed) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== 'string' || !allowed.includes(key) || !descriptors[key].enumerable || !Object.hasOwn(descriptors[key], 'value'))) return null;
  return descriptors;
}

// Read only type, prototype and the one own length descriptor before any
// enumeration. An oversized ordinary array must never reach denseArray's copy.
export function arrayLength(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
  const length = descriptor.value;
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

export function denseArray(value) {
  const length = arrayLength(value);
  if (length === null || length > 20) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== length + 1) return null;
  const rows = [];
  for (let i = 0; i < length; i += 1) {
    const descriptor = descriptors[String(i)];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
    rows.push(descriptor.value);
  }
  return rows;
}

export const failure = (code, field) => ({ ok: false, error: { code, field } });
export const requestKeys = Object.freeze(['installAreas', 'deductionAreas', 'tileLengthCmRaw', 'tileWidthCmRaw', 'boxPiecesRaw', 'reservePercentRaw']);
export const rowKeys = Object.freeze(['id', 'nameRaw', 'lengthMetersRaw', 'widthMetersRaw']);
export const resultKeys = Object.freeze(['schemaVersion', 'installAreas', 'deductionAreas', 'tile', 'reservePercentTenths', 'boxPieces', 'totals']);
export const resultRowKeys = Object.freeze(['name', 'lengthMm', 'widthMm', 'areaMm2', 'areaM2Display']);
export const tileKeys = Object.freeze(['lengthMm', 'widthMm', 'areaMm2', 'areaM2Display']);
export const totalKeys = Object.freeze(['installAreaMm2', 'installAreaM2Display', 'deductionAreaMm2', 'deductionAreaM2Display', 'netAreaMm2', 'netAreaM2Display', 'basePieces', 'piecesWithReserve', 'boxes', 'purchasedPieces', 'extraAfterReserve', 'purchasedAreaMm2', 'purchasedAreaM2Display']);

export function nameError(raw) {
  if (typeof raw !== 'string') return 'invalid_type';
  if (raw.length > 256) return 'invalid_name';
  if (!raw.isWellFormed() || /\p{Cc}/u.test(raw)) return 'invalid_unicode';
  if ([...raw.trim()].length > 40) return 'invalid_name';
  return null;
}

export function parseDecimal(raw, precision, minimum, maximum) {
  if (typeof raw !== 'string') return { code: 'invalid_type' };
  if (raw.length > 32) return { code: 'input_too_long' };
  const text = raw.replace(/^[\u0009-\u000d\u0020]+|[\u0009-\u000d\u0020]+$/g, '');
  if (!(precision === 0 ? /^[0-9]+$/ : /^[0-9]+(?:\.[0-9]+)?$/).test(text)) return { code: 'invalid_number' };
  const [integer, fraction = ''] = text.split('.');
  if (fraction.length > precision) return { code: 'precision_exceeded' };
  const value = BigInt(integer + fraction.padEnd(precision, '0'));
  if (value < minimum || value > maximum) return { code: 'out_of_range' };
  return { value };
}

export function formatScaled(value, decimals) {
  const digits = String(value).padStart(decimals + 1, '0');
  return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

export const areaDisplay = value => formatScaled((value + 5000n) / 10000n, 2);
export const ceilDiv = (value, divisor) => (value + divisor - 1n) / divisor;

export function makeArea(name, lengthMm, widthMm) {
  const area = lengthMm * widthMm;
  return { name, lengthMm: String(lengthMm), widthMm: String(widthMm), areaMm2: String(area), areaM2Display: areaDisplay(area) };
}

export function makeResult(installAreas, deductionAreas, tileLengthMm, tileWidthMm, boxPieces, reserveTenths) {
  const installed = installAreas.reduce((sum, row) => sum + BigInt(row.areaMm2), 0n);
  const deducted = deductionAreas.reduce((sum, row) => sum + BigInt(row.areaMm2), 0n);
  const net = installed - deducted;
  const tileArea = tileLengthMm * tileWidthMm;
  const base = ceilDiv(net, tileArea);
  const reserved = ceilDiv(net * (1000n + reserveTenths), 1000n * tileArea);
  const boxes = ceilDiv(reserved, boxPieces);
  const purchase = boxes * boxPieces;
  const purchasedArea = purchase * tileArea;
  return {
    schemaVersion: 1,
    installAreas, deductionAreas,
    tile: { lengthMm: String(tileLengthMm), widthMm: String(tileWidthMm), areaMm2: String(tileArea), areaM2Display: areaDisplay(tileArea) },
    reservePercentTenths: String(reserveTenths), boxPieces: String(boxPieces),
    totals: {
      installAreaMm2: String(installed), installAreaM2Display: areaDisplay(installed),
      deductionAreaMm2: String(deducted), deductionAreaM2Display: areaDisplay(deducted),
      netAreaMm2: String(net), netAreaM2Display: areaDisplay(net),
      basePieces: String(base), piecesWithReserve: String(reserved), boxes: String(boxes), purchasedPieces: String(purchase), extraAfterReserve: String(purchase - reserved),
      purchasedAreaMm2: String(purchasedArea), purchasedAreaM2Display: areaDisplay(purchasedArea),
    },
  };
}
