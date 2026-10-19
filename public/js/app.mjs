import { initialState, reduce } from './state.mjs';
import { messages } from './messages.mjs';
import { renderRows, renderResult } from './render.mjs';

const form = document.getElementById('estimate-form');
let ready = false;
// The first synchronous registration prevents any form navigation, even if a
// later initialization step fails. HTML fieldsets/buttons start disabled.
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!ready || composing) return;
  state = reduce(state, { type: 'calculate' }, language);
  paintDerived();
  if (state.error) errorTarget(state.error.field)?.focus();
});

let state = initialState();
let composing = false;
let returnFocus = null;
const language = document.documentElement.lang;
const copy = messages[language];
const fields = new Map();
const get = id => document.getElementById(id);
const groups = ['installAreas', 'deductionAreas'];
const rootFields = ['tileLengthCmRaw', 'tileWidthCmRaw', 'boxPiecesRaw', 'reservePercentRaw'];
const groupTarget = field => field.startsWith('deductionAreas') ? 'deductionAreas' : 'installAreas';
const errorTarget = field => fields.get(field.replace(/^request\./, ''))?.input ?? get(groupTarget(field));

function paintRows() {
  for (const key of [...fields.keys()]) if (/^(installAreas|deductionAreas)\./.test(key)) fields.delete(key);
  for (const group of groups) {
    renderRows(get(`${group}-rows`), state.draft[group], group, language, copy, fields, index => {
      state = reduce(state, { type: 'remove', group, index }, language);
      paintRows(); paintDerived();
      const target = get(`${group}-rows`).querySelectorAll('.remove-area')[Math.min(index, state.draft[group].length - 1)];
      if (target && !target.disabled) target.focus();
      else (get(`${group}-rows`).querySelector('input') ?? get(`${group}-add`)).focus();
    });
    get(`${group}-count`).textContent = copy.count(state.draft[group].length);
    get(`${group}-add`).disabled = state.draft[group].length === 20;
  }
}

function paintDerived() {
  for (const { input, error } of fields.values()) { input.removeAttribute('aria-invalid'); error.textContent = ''; error.hidden = true; }
  for (const group of groups) { get(group).removeAttribute('aria-invalid'); get(`${group}-error`).textContent = ''; get(`${group}-error`).hidden = true; }
  if (state.error) {
    const target = fields.get(state.error.field.replace(/^request\./, ''));
    const message = copy.errors[state.error.code] ?? copy.errors.invalid_request;
    if (target) { target.input.setAttribute('aria-invalid', 'true'); target.error.textContent = message; target.error.hidden = false; }
    else { const group = groupTarget(state.error.field); get(group).setAttribute('aria-invalid', 'true'); get(`${group}-error`).textContent = message; get(`${group}-error`).hidden = false; }
  }
  get('estimate-status').textContent = copy.status[state.status];
  renderResult(get('result-values'), state.result, language, copy);
  get('report').value = state.report;
  get('report-section').hidden = !state.result;
  get('result-notes').hidden = !state.result;
  get('clear').disabled = !ready || !state.hasWork;
}

function resetView() {
  state = initialState(); composing = false;
  if (get('confirm-dialog').open) get('confirm-dialog').close();
  returnFocus = null;
  for (const field of rootFields) get(field).value = state.draft[field];
  paintRows(); paintDerived();
}

function requestConfirmation(kind, trigger) {
  if (!state.hasWork) {
    if (kind === 'language') location.assign(language === 'en' ? '/' : '/en/');
    return;
  }
  state = reduce(state, { type: `request-${kind}` }, language);
  returnFocus = trigger;
  get('confirm-title').textContent = copy.confirmTitle[kind];
  get('confirm-body').textContent = copy.confirmBody[kind];
  get('confirm-accept').textContent = copy.confirmButton[kind];
  get('confirm-dialog').showModal();
  get('confirm-cancel').focus();
}

function cancelConfirmation() {
  state = reduce(state, { type: 'cancel' }, language);
  get('confirm-dialog').close();
  const trigger = returnFocus; returnFocus = null; trigger?.focus();
}

try {
  if (!copy) throw new Error('Unsupported page');
  for (const field of rootFields) fields.set(field, { input: get(field), error: get(`${field}-error`) });
  form.addEventListener('compositionstart', () => { composing = true; });
  form.addEventListener('compositionend', () => { composing = false; });
  form.addEventListener('input', event => {
    const field = event.target.dataset.field;
    if (!field) return;
    state = reduce(state, { type: 'edit', field, value: event.target.value }, language);
    paintDerived(); // Never rewrites input.value or moves focus while typing.
  });
  for (const group of groups) get(`${group}-add`).addEventListener('click', () => {
    state = reduce(state, { type: 'add', group }, language);
    paintRows(); paintDerived();
    get(`${group}-rows`).lastElementChild.querySelector('input')?.focus();
  });
  get('clear').addEventListener('click', () => requestConfirmation('clear', get('clear')));
  get('language-link').addEventListener('click', event => { event.preventDefault(); if (ready) requestConfirmation('language', get('language-link')); });
  get('confirm-cancel').addEventListener('click', cancelConfirmation);
  get('confirm-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelConfirmation(); });
  get('confirm-accept').addEventListener('click', () => {
    const kind = state.confirmation;
    state = reduce(state, { type: 'confirm' }, language);
    resetView();
    if (kind === 'language') location.assign(language === 'en' ? '/' : '/en/');
    else get('installAreas-rows').querySelector('input').focus();
  });
  window.addEventListener('pagehide', resetView);
  window.addEventListener('pageshow', event => { if (event.persisted) resetView(); });
  resetView();
  for (const fieldset of form.querySelectorAll('fieldset')) fieldset.disabled = false;
  for (const id of ['calculate', 'confirm-cancel', 'confirm-accept']) get(id).disabled = false;
  ready = true;
  paintDerived();
  get('initialization-note').hidden = true;
} catch {
  ready = false;
  for (const fieldset of form.querySelectorAll('fieldset')) fieldset.disabled = true;
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  get('initialization-note').textContent = copy?.unavailable ?? 'Calculation unavailable.';
  get('initialization-note').hidden = false;
}
