import { calculateTileEstimate } from './core/tile-estimator.mjs';
import { buildReport } from './core/report.mjs';

const blankRow = id => ({ id, nameRaw: '', lengthMetersRaw: '', widthMetersRaw: '' });
export function initialState() {
  return {
    draft: { installAreas: [blankRow('area-1')], deductionAreas: [], tileLengthCmRaw: '', tileWidthCmRaw: '', boxPiecesRaw: '10', reservePercentRaw: '10.0' },
    hasWork: false, result: null, report: '', error: null, status: 'empty', confirmation: null,
  };
}
const edited = (state, draft) => ({ ...state, draft, hasWork: true, result: null, report: '', error: null, status: 'changed', confirmation: null });

// This reducer proves only state transitions. Browser focus, IME, navigation,
// rendering and BFCache behavior require the separately blocked UI checks.
export function reduce(state, action, language) {
  if (action.type === 'reset') return initialState();
  if (action.type === 'cancel') return { ...state, confirmation: null };
  if (action.type === 'confirm') return state.confirmation ? initialState() : state;
  if (action.type === 'request-clear' || action.type === 'request-language') return state.hasWork ? { ...state, confirmation: action.type === 'request-clear' ? 'clear' : 'language' } : state;
  if (state.confirmation) return state;
  if (action.type === 'edit') {
    if (typeof action.value !== 'string') return state;
    const draft = { ...state.draft };
    if (['tileLengthCmRaw', 'tileWidthCmRaw', 'boxPiecesRaw', 'reservePercentRaw'].includes(action.field)) draft[action.field] = action.value;
    else {
      const match = /^(installAreas|deductionAreas)\.([0-9]{1,2})\.(nameRaw|lengthMetersRaw|widthMetersRaw)$/.exec(action.field);
      if (!match || !draft[match[1]][Number(match[2])]) return state;
      draft[match[1]] = draft[match[1]].map((row, index) => index === Number(match[2]) ? { ...row, [match[3]]: action.value } : row);
    }
    return edited(state, draft);
  }
  if (action.type === 'add' || action.type === 'remove') {
    if (!['installAreas', 'deductionAreas'].includes(action.group)) return state;
    const rows = state.draft[action.group];
    if (action.type === 'add') {
      if (rows.length >= 20) return state;
      const used = new Set(rows.map(row => row.id));
      const prefix = action.group === 'installAreas' ? 'area' : 'ded';
      let id = 1;
      while (used.has(`${prefix}-${id}`)) id += 1;
      return edited(state, { ...state.draft, [action.group]: [...rows, blankRow(`${prefix}-${id}`)] });
    }
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= rows.length || (action.group === 'installAreas' && rows.length === 1)) return state;
    return edited(state, { ...state.draft, [action.group]: rows.filter((_, index) => index !== action.index) });
  }
  if (action.type === 'calculate') {
    const estimate = calculateTileEstimate(state.draft);
    if (!estimate.ok) return { ...state, result: null, report: '', error: estimate.error, status: 'invalid' };
    const report = buildReport(estimate.result, language);
    if (!report.ok) return { ...state, result: null, report: '', error: report.error, status: 'invalid' };
    return { ...state, result: estimate.result, report: report.text, error: null, status: 'success' };
  }
  return state;
}
