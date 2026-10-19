import { checkProduction, pages } from './lib/production.mjs';
try {
  const checked = await checkProduction();
  for (const page of pages) {
    const html = checked.records.get(page.file).toString('utf8');
    if (html.split('<script type="module" src="/js/app.mjs"></script>').length !== 2 || html.includes('localhost') || html.includes('127.0.0.1')) throw new Error('Release page contains a local/runtime mismatch');
  }
  console.log(JSON.stringify({ status: 'PASS', assets: checked.records.size, runtimeWorker: false, deploymentPerformed: false, publicBytes: 'M1 pinned', productionBrowserNetworkStorage: 'NOT_RUN_PRIMARY_ISOLATED_RUNNER_REQUIRED', manual: ['native IME', 'real AT', 'native zoom', 'physical low-end/mobile', 'virtual keyboard'] }));
} catch (error) { console.error(`FAIL release check: ${error.message}`); process.exitCode = 1; }
