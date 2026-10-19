import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const publicRoot = path.join(projectRoot, 'public');
export const distRoot = path.join(projectRoot, 'dist');
export const assets = Object.freeze([
  'index.html', 'en/index.html', 'styles/app.css',
  'js/core/schema.mjs', 'js/core/tile-estimator.mjs', 'js/core/report.mjs',
  'js/app.mjs', 'js/render.mjs', 'js/messages.mjs', 'js/state.mjs',
]);
export const csp = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'";
export const contentTypes = Object.freeze({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' });
export const pageContracts = Object.freeze({
  'zh-Hant': {
    title: '鋪材用量試算：估算磁磚／板材片數與整箱數｜Gloss Tools',
    description: '依矩形鋪設面積、扣除面積、相同尺寸磁磚或板材與可調備料假設，估算片數及整箱數。只做面積試算，不提供排版或施工建議。',
    heading: '鋪材用量試算', home: 'https://glossquote.com/index.html', languagePath: '/en/',
    questions: ['這會算出精確採購數量嗎？', '預設 10% 備料是建議嗎？', '扣除區要標出位置嗎？', '離線能用嗎？'],
  },
  en: {
    title: 'Tile and Panel Usage Estimator: Estimate Pieces and Boxes | Gloss Tools',
    description: 'Estimate same-size tile or panel and full-box counts from rectangular installed and deducted areas, dimensions, and an editable reserve assumption. Area estimate only; no layout or installation advice.',
    heading: 'Tile and Panel Usage Estimator', home: 'https://glossquote.com/en/index.html', languagePath: '/',
    questions: ['Does this give an exact purchase quantity?', 'Is the default 10% reserve a recommendation?', 'Do deducted areas need positions?', 'Can I use it offline?'],
  },
});

// No following links: every component, including the root, is checked first.
export async function inventory(root, { complete = true } = {}) {
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || path.resolve(await realpath(root)).toLowerCase() !== path.resolve(root).toLowerCase()) throw new Error('Unsafe static root');
  const files = [];
  const allowedDirs = new Set(assets.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
  async function visit(relative = '') {
    for (const entry of await readdir(path.join(root, relative))) {
      const rel = relative ? `${relative}/${entry}` : entry;
      const info = await lstat(path.join(root, rel));
      if (info.isSymbolicLink()) throw new Error('Linked static path');
      if (info.isDirectory() && allowedDirs.has(rel)) await visit(rel);
      else if (info.isFile() && assets.includes(rel) && info.nlink === 1 && info.size <= 262144) files.push(rel);
      else throw new Error('Unapproved static path');
    }
  }
  await visit();
  files.sort();
  if (complete && (files.length !== assets.length || assets.some(file => !files.includes(file)))) throw new Error('Missing static asset');
  return files;
}

export function validateHtml(html, language) {
  if (!html.includes(`<html lang="${language}">`) || !/<meta name="robots" content="noindex,nofollow">/.test(html) || !/<title>[^<]+<\/title>/.test(html) || !/<meta name="description" content="[^"]+">/.test(html) || !/<h1[^>]*>[^<]+<\/h1>/.test(html) || !/<noscript>/.test(html) || !/<fieldset[^>]*disabled/.test(html)) throw new Error('Missing preview page contract');
  if (/<(?:base|iframe|object|embed|img|video|audio|source|svg|math|style)\b|\b(?:on\w+|style|srcset|ping|download)\s*=|\bname\s*=\s*"(?!viewport|description|robots|referrer)[^"]*"|rel="(?:canonical|alternate)"|<script(?![^>]*src=)/i.test(html)) throw new Error('Forbidden page capability');
  for (const match of html.matchAll(/\b(?:src|href|action)="([^"]*)"/g)) {
    if (!match[1].startsWith('/') && !match[1].startsWith('#') && !['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(match[1])) throw new Error('Unapproved resource reference');
    if (match[1].startsWith('//') || match[1].includes('..')) throw new Error('Unsafe resource path');
  }
  const contract = pageContracts[language];
  if (!contract || !html.includes(`<title>${contract.title}</title>`) || !html.includes(`<meta name="description" content="${contract.description}">`) || !html.includes(`<h1>${contract.heading}</h1>`) || !contract.questions.every(question => html.includes(`<h4>${question}</h4>`))) throw new Error('Incomplete localized page');
  const script = '<script type="module" src="/js/app.mjs"></script>';
  const style = '<link rel="stylesheet" href="/styles/app.css">';
  if (html.split(script).length !== 2 || html.split(style).length !== 2 || /<(?:script|link)\b/i.test(html.replace(script, '').replace(style, ''))) throw new Error('Unapproved resource element');
  for (const match of html.matchAll(/\bhref="([^"]*)"/g)) if (!match[1].startsWith('#') && ![contract.languagePath, contract.home, '/styles/app.css'].includes(match[1])) throw new Error('Unapproved navigation');
  const metaCsp = csp.replace("; frame-ancestors 'none'", '');
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="${metaCsp}">`)) throw new Error('Missing page CSP');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate element ID');
  const required = ['estimate-form', 'worksheet', 'language-link', 'language-note', 'initialization-note', 'calculate', 'clear', 'estimate-status', 'result-values', 'result-notes', 'report-section', 'report', 'confirm-dialog', 'confirm-title', 'confirm-body', 'confirm-cancel', 'confirm-accept', 'tileLengthCmRaw', 'tileWidthCmRaw', 'boxPiecesRaw', 'reservePercentRaw'];
  for (const group of ['installAreas', 'deductionAreas']) required.push(group, `${group}-rows`, `${group}-add`, `${group}-count`, `${group}-error`);
  if (!required.every(id => ids.includes(id))) throw new Error('Missing application element');
  for (const match of html.matchAll(/\b(?:aria-describedby|aria-labelledby|for)="([^"]+)"/g)) if (!match[1].split(' ').every(id => ids.includes(id))) throw new Error('Broken label reference');
  const form = /<form\b[^>]*>([\s\S]*?)<\/form>/.exec(html)?.[1];
  const fieldsets = [...(form ?? '').matchAll(/<fieldset\b([^>]*)>[\s\S]*?<\/fieldset>/g)];
  if (!form || fieldsets.length !== 2 || fieldsets.some(match => !/\bdisabled\b/.test(match[1])) || /<input\b/.test(form.replace(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/g, ''))) throw new Error('Unsafe pre-initialization form');
  for (const id of ['calculate', 'clear', 'confirm-cancel', 'confirm-accept']) if (!new RegExp(`<button\\b[^>]*id="${id}"[^>]*\\bdisabled\\b`).test(html)) throw new Error('Enabled pre-initialization action');
  if (!/<textarea id="report" readonly/.test(html) || /<input\b[^>]*\bname\s*=/i.test(html)) throw new Error('Unexpected input capability');
}

export function validateModule(source, file) {
  if (/\b(?:localStorage|sessionStorage|indexedDB|cookie|caches|serviceWorker|fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|clipboard|Blob|FileReader|showOpenFilePicker|showSaveFilePicker|console)\b|\.\s*(?:innerHTML|outerHTML|insertAdjacentHTML)\b|\b(?:eval|Function|Worker|SharedWorker)\s*\(|\bimport\s*\(|\b(?:confirm|alert|prompt)\s*\(/.test(source)) throw new Error('Forbidden module capability');
  if (/\b(?:https?:|data:|blob:|node:)/.test(source)) throw new Error('External module reference');
  for (const match of source.matchAll(/\b(?:import|export)[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)) {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
    if (!match[1].startsWith('./') && !match[1].startsWith('../')) throw new Error('Nonlocal module');
    if (!assets.includes(dependency) || !dependency.endsWith('.mjs')) throw new Error('Unapproved module dependency');
  }
  if (/\bimport\b/.test(source.replace(/\bimport\s+\{[^}]*\}\s+from\s*['"][^'"]+['"]\s*;/g, ''))) throw new Error('Unapproved import form');
}

export async function validateStatic(root) {
  const files = await inventory(root);
  validateHtml(await readFile(path.join(root, 'index.html'), 'utf8'), 'zh-Hant');
  validateHtml(await readFile(path.join(root, 'en/index.html'), 'utf8'), 'en');
  const css = await readFile(path.join(root, 'styles/app.css'), 'utf8');
  if (/@import|@font-face|url\s*\(/i.test(css) || !css.includes('min-width: 48rem') || !css.includes('min-width: 75rem') || !css.includes('prefers-reduced-motion') || !css.includes(':focus-visible')) throw new Error('Stylesheet contract failed');
  for (const file of files.filter(file => file.endsWith('.mjs'))) validateModule(await readFile(path.join(root, file), 'utf8'), file);
  return files;
}
