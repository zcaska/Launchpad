/**
 * Real-DOM UI verification harness for the manual daily review flow.
 *
 * Runs tests/reviews/ui-review-fixture.html (which mounts the ACTUAL
 * DailyReviewPanel + DailyGrowthReview with REAL IndexedDB) inside Orca's
 * built-in browser via `orca tab create` / `orca tab close`.
 *
 * Guarantees:
 * - Truly random EPHEMERAL loopback origin: a dedicated node:http server
 *   listening on port 0 at 127.0.0.1 — Vite runs in middlewareMode behind
 *   it. (Vite's own `server.port: 0` defaults to 5173 and does NOT bind a
 *   random port, so it is deliberately not used here.)
 * - Fresh origin per run => fresh IndexedDB; no app/main origin, no live
 *   user data.
 * - Shell-free process invocation: execFile with the exact resolved Orca
 *   executable and argument array. Never bare shell `orca`.
 * - Requires a nonempty runtime browserPageId from `tab create --json`.
 * - Tab and server teardown happen in finally, with a bounded timeout on
 *   waiting for results.
 */

import { execFile } from 'node:child_process';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';

const execFileAsync = promisify(execFile);

/** Bounded total wait for the fixture to post results. */
const TIMEOUT_MS = 150000;

/**
 * Resolve the exact Orca CLI executable: ORCA_CLI_COMMAND when it is a real
 * file path, otherwise the known installed orca.exe. Never falls back to a
 * bare shell command.
 */
function resolveOrcaExecutable(): string {
  const env = process.env.ORCA_CLI_COMMAND?.trim();
  if (env) {
    if (existsSync(env)) return env;
    throw new Error(
      `ORCA_CLI_COMMAND is set ("${env}") but does not point to an existing executable; refusing a shell fallback.`
    );
  }
  const installed = 'C:\\Users\\AGP\\AppData\\Local\\Programs\\orca\\resources\\bin\\orca.exe';
  if (existsSync(installed)) return installed;
  throw new Error('Orca executable not found: ORCA_CLI_COMMAND unset and installed orca.exe missing.');
}

interface UiAssertion {
  passed: boolean;
  name: string;
  error?: string;
}
interface UiReport {
  browser: string;
  userAgent: string;
  passed: boolean;
  totalScenarios: number;
  passedScenarios: number;
  totalAssertions: number;
  passedAssertions: number;
  fatal?: string;
  scenarios: Array<{
    name: string;
    passed: boolean;
    durationMs: number;
    assertions: UiAssertion[];
  }>;
  durationMs: number;
}

async function runUiVerification(): Promise<void> {
  console.log('=== Daily Review Real-DOM UI Verification Harness ===\n');
  console.log('Environment: Orca built-in browser, real DOM components, real IndexedDB\n');

  const workspaceRoot = process.cwd();
  const orcaExe = resolveOrcaExecutable();
  console.log(`Orca executable: ${orcaExe}`);

  let resultsReceived: (report: UiReport) => void;
  const resultsPromise = new Promise<UiReport>((resolve) => {
    resultsReceived = resolve;
  });

  // 1. Dedicated node:http server on a truly random loopback port, Vite in
  //    middlewareMode behind it (own /api endpoints run BEFORE vite).
  console.log('1. Starting dedicated node:http server on 127.0.0.1:0 with Vite middlewareMode...');
  const vite = await createViteServer({
    configFile: false,
    root: workspaceRoot,
    appType: 'spa',
    server: { middlewareMode: true },
    logLevel: 'error',
    plugins: [react()],
  });

  const readBody = (req: http.IncomingMessage): Promise<string> =>
    new Promise((resolveBody) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => resolveBody(body));
    });

  const server = http.createServer(async (req, res) => {
    if (req.url === '/api/log' && req.method === 'POST') {
      const body = await readBody(req);
      try {
        console.log(`   [Browser Log] ${JSON.parse(body)}`);
      } catch {
        /* ignore parse errors */
      }
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.url === '/api/test-results' && req.method === 'POST') {
      const body = await readBody(req);
      try {
        const report = JSON.parse(body) as UiReport;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
        resultsReceived(report);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }
    // Everything else goes through Vite's middleware stack.
    vite.middlewares(req, res);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const port = (server.address() as AddressInfo).port;
  console.log(`   ✓ ephemeral origin listening at http://127.0.0.1:${port}/ (random port 0 bind)`);

  // 2. Open a dedicated tab in Orca's built-in browser (shell-free execFile).
  const testUrl = `http://127.0.0.1:${port}/tests/reviews/ui-review-fixture.html`;
  console.log(`2. Opening fixture in Orca built-in browser: ${testUrl}`);
  const { stdout: rawCreate } = await execFileAsync(orcaExe, ['tab', 'create', '--url', testUrl, '--json']);
  let createJson: unknown;
  try {
    createJson = JSON.parse(rawCreate);
  } catch (err) {
    throw new Error(`orca tab create did not return JSON: ${rawCreate.slice(0, 300)}`);
  }
  const browserPageId =
    (createJson as { result?: { browserPageId?: string } })?.result?.browserPageId ??
    (createJson as { browserPageId?: string })?.browserPageId;
  if (!browserPageId || String(browserPageId).trim() === '') {
    throw new Error(`orca tab create returned no nonempty browserPageId: ${rawCreate.slice(0, 300)}`);
  }
  console.log(`   ✓ Orca tab created, browserPageId=${browserPageId}`);

  let timer: NodeJS.Timeout | null = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`UI verification timed out after ${TIMEOUT_MS / 1000}s waiting for fixture results`));
      }, TIMEOUT_MS);
    });

    const report: UiReport = await Promise.race([resultsPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    console.log(`\n3. Results received (${report.browser}):`);
    console.log(`   User Agent: ${report.userAgent}`);
    console.log(`   Duration: ${report.durationMs.toFixed(1)}ms\n`);

    for (const scenario of report.scenarios) {
      const icon = scenario.passed ? '✓' : '✗';
      const passedCount = scenario.assertions.filter((a) => a.passed).length;
      console.log(
        `   ${icon} ${scenario.name} (${passedCount}/${scenario.assertions.length} assertions, ${scenario.durationMs.toFixed(1)}ms)`
      );
      for (const a of scenario.assertions) {
        if (!a.passed) {
          console.error(`      ❌ Assertion FAILED: ${a.name}\n${a.error || ''}`);
        } else {
          console.log(`      ✅ ${a.name}`);
        }
      }
    }

    console.log(
      `\nSummary: ${report.passedScenarios}/${report.totalScenarios} scenarios passed (${report.passedAssertions}/${report.totalAssertions} individual assertions).`
    );

    if (!report.passed || report.passedScenarios !== report.totalScenarios) {
      throw new Error(`UI verification failed: ${report.fatal || 'see failed assertions above'}`);
    }
    console.log('\n🎉 ALL DAILY REVIEW UI VERIFICATION SCENARIOS PASSED (real DOM + real IndexedDB)!');
  } finally {
    if (timer) clearTimeout(timer);
    // Teardown: close the Orca tab, then the server and Vite middleware.
    try {
      await execFileAsync(orcaExe, ['tab', 'close', '--page', String(browserPageId), '--json']);
      console.log('\n   ✓ Orca tab closed.');
    } catch (err) {
      console.log(`\n   ! Failed to close Orca tab ${browserPageId}: ${String(err)}`);
    }
    try {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    } catch {
      /* ignore */
    }
    try {
      await vite.close();
      console.log('   ✓ Ephemeral server + Vite middleware closed.');
    } catch {
      /* ignore */
    }
  }
}

runUiVerification().catch((err) => {
  console.error('\n💥 UI VERIFICATION RUNNER FAILED:', err instanceof Error ? `${err.message}\n${err.stack}` : err);
  process.exit(1);
});
