import { checkProduction } from './lib/production.mjs';
try { const result = await checkProduction(); console.log(`PASS production check: ${result.records.size} exact assets; bilingual SEO/JSON-LD/CSP; merged headers and longest-match robots`); }
catch (error) { console.error(`FAIL production check: ${error.message}`); process.exitCode = 1; }
