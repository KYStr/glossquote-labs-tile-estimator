import { buildProduction } from './lib/production.mjs';
try { const result = await buildProduction(); console.log(`PASS production build: ${result.files.length} closed assets; manifest outside assets; M1 public unchanged`); }
catch (error) { console.error(`FAIL production build: ${error.message}`); process.exitCode = 1; }
