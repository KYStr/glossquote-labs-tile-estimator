import { areaName } from './core/report.mjs';
import { formatScaled } from './core/schema.mjs';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function renderRows(container, rows, group, language, copy, fields, onRemove) {
  const nodes = rows.map((row, index) => {
    const section = element('div', undefined, 'area-row');
    section.append(element('h3', areaName('', index, language)));
    const grid = element('div', undefined, 'row-fields');
    for (const [key, label, hint] of [['nameRaw', copy.name, copy.nameHelp], ['lengthMetersRaw', copy.length, copy.metersHelp], ['widthMetersRaw', copy.width, copy.metersHelp]]) {
      const field = element('div', undefined, 'field');
      const input = element('input');
      const id = `${group}-${row.id}-${key}`;
      input.id = id; input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = key === 'nameRaw' ? 256 : 32;
      if (key !== 'nameRaw') input.inputMode = 'decimal';
      input.value = row[key]; input.dataset.field = `${group}.${index}.${key}`;
      const title = element('label', label); title.htmlFor = id;
      const help = element('p', hint, 'hint'); help.id = `${id}-help`;
      const error = element('p', '', 'field-error'); error.id = `${id}-error`; error.hidden = true;
      input.setAttribute('aria-describedby', `${help.id} ${error.id}`);
      fields.set(input.dataset.field, { input, error });
      field.append(title, input, help, error); grid.append(field);
    }
    const remove = element('button', copy.remove, 'quiet remove-area');
    remove.type = 'button'; remove.disabled = group === 'installAreas' && rows.length === 1;
    remove.setAttribute('aria-label', `${copy.remove}: ${areaName('', index, language)}`);
    remove.addEventListener('click', () => onRemove(index));
    section.append(grid, remove);
    return section;
  });
  if (!rows.length) nodes.push(element('p', copy.emptyDeduction, 'hint'));
  container.replaceChildren(...nodes);
}

export function renderResult(container, result, language, copy) {
  if (!result) { container.replaceChildren(); return; }
  const area = (display, exact) => `${display} m² (${copy.exact} ${exact} mm²)`;
  const dimensions = (row, decimals, unit) => `${formatScaled(row.lengthMm, decimals)} ${unit} × ${formatScaled(row.widthMm, decimals)} ${unit}`;
  const fragment = document.createDocumentFragment();
  const summary = element('dl', undefined, 'estimate-summary');
  for (const [label, value] of [[copy.boxes, `${result.totals.boxes} ${copy.boxesUnit}`], [copy.purchased, `${result.totals.purchasedPieces} ${copy.piecesUnit}`]]) {
    const pair = element('div'); pair.append(element('dt', label), element('dd', value)); summary.append(pair);
  }
  fragment.append(summary);
  const breakdown = element('dl', undefined, 'breakdown');
  const t = result.totals;
  const entries = [
    [copy.installedTotal, area(t.installAreaM2Display, t.installAreaMm2)], [copy.deductedTotal, area(t.deductionAreaM2Display, t.deductionAreaMm2)], [copy.net, area(t.netAreaM2Display, t.netAreaMm2)],
    [copy.tile, dimensions(result.tile, 1, 'cm')], [copy.onePiece, area(result.tile.areaM2Display, result.tile.areaMm2)],
    [copy.base, `${t.basePieces} ${copy.piecesUnit}`], [copy.reservePieces, `${t.piecesWithReserve} ${copy.piecesUnit}`], [copy.reserve, `${formatScaled(result.reservePercentTenths, 1)}%`],
    [copy.boxPieces, result.boxPieces], [copy.extra, `${t.extraAfterReserve} ${copy.piecesUnit}`], [copy.purchasedArea, area(t.purchasedAreaM2Display, t.purchasedAreaMm2)],
  ];
  for (const [label, value] of entries) { const pair = element('div'); pair.append(element('dt', label), element('dd', value)); breakdown.append(pair); }
  fragment.append(breakdown);
  for (const [key, heading] of [['installAreas', copy.installed], ['deductionAreas', copy.deducted]]) {
    fragment.append(element('h3', heading));
    const list = element('ol', undefined, 'result-areas');
    result[key].forEach((row, index) => {
      const item = element('li');
      item.append(element('strong', areaName(row.name, index, language)), element('p', dimensions(row, 3, 'm')), element('p', area(row.areaM2Display, row.areaMm2)));
      list.append(item);
    });
    fragment.append(result[key].length ? list : element('p', copy.emptyDeduction, 'hint'));
  }
  container.replaceChildren(fragment);
}
