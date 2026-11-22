/**
 * LaunchPad Native Browser IndexedDB Test Harness (Stage 2A)
 *
 * Spawns an isolated local Vite server (configFile: false, random loopback port)
 * and executes native browser IndexedDB tests inside Orca's built-in browser engine.
 *
 * Guarantees:
 * - Real browser IndexedDB execution (zero mocks / in-memory fakes).
 * - Exclusively uses Orca built-in browser (no external Chrome/Brave/Edge processes).
 * - Isolated test page without application, proxy, or OAuth startup.
 * - Bound to random available loopback port (no port collisions).
 * - Cleanly tears down Orca browser tab and Vite server in finally block.
 * - Collects and reports honest counts of test suites and individual assertions.
 */

import { exec } from 'node:child_process';
import { AddressInfo } from 'node:net';
import { promisify } from 'node:util';
import { createServer } from 'vite';

const execAsync = promisify(exec);

const TIMEOUT_MS = 45000;

interface TestAssertion {
  passed: boolean;
  name: string;
  durationMs: number;
  error?: string;
}

interface TestSuite {
  suite: string;
  passed: boolean;
  durationMs: number;
  assertions: TestAssertion[];
}

interface TestReport {
  browser: string;
  userAgent: string;
  passed: boolean;
  totalSuites: number;
  passedSuites: number;
  totalAssertions: number;
  passedAssertions: number;
  suites: TestSuite[];
  durationMs: number;
  error?: string;
}

async function runBrowserTests(): Promise<void> {
  console.log('=== Stage 2A Native Browser IndexedDB Test Harness ===\n');
  console.log('Environment: Orca Built-in Browser (Native window.indexedDB)');

  const workspaceRoot = process.cwd();

  let resultsReceived: (report: TestReport) => void;
  const resultsPromise = new Promise<TestReport>((resolve) => {
    resultsReceived = resolve;
  });

  // 1. Start isolated local Vite server on random loopback port with configFile: false
  console.log('1. Starting isolated local Vite test server on loopback port 0 (configFile: false)...');
  const viteServer = await createServer({
    configFile: false,
    root: workspaceRoot,
    server: {
      host: '127.0.0.1',
      port: 0,
    },
    logLevel: 'error',
    plugins: [
      {
        name: 'test-harness-endpoints',
        configureServer(server) {
          server.middlewares.use('/api/log', (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (c) => (body += c));
              req.on('end', () => {
                try {
                  const msg = JSON.parse(body);
                  console.log(`   [Browser Log] ${msg}`);
                } catch {
                  // Ignore parse error
                }
                res.writeHead(200);
                res.end();
              });
            } else {
              res.writeHead(405);
              res.end();
            }
          });

          server.middlewares.use('/api/test-results', (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const report = JSON.parse(body);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ received: true }));
                  resultsReceived(report);
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: String(err) }));
                }
              });
            } else {
              res.writeHead(405);
              res.end();
            }
          });
        },
      },
    ],
  });

  await viteServer.listen();
  const address = viteServer.httpServer?.address() as AddressInfo;
  const port = address.port;
  console.log(`   ✓ Local test server listening at http://127.0.0.1:${port}/`);

  // 2. Open dedicated test tab in Orca's built-in browser
  const testUrl = `http://127.0.0.1:${port}/tests/db/test-runner.html`;
  console.log(`2. Opening test tab in Orca built-in browser: ${testUrl}`);

  let browserPageId: string | undefined;
  try {
    const { stdout: rawCreate } = await execAsync(`orca tab create --url "${testUrl}" --json`);
    const parsedCreate = JSON.parse(rawCreate);
    browserPageId = parsedCreate.result?.browserPageId;
    console.log(`   ✓ Orca tab created with page ID: ${browserPageId}`);
  } catch (err) {
    throw new Error(`Failed to create Orca browser tab: ${String(err)}`);
  }

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Browser test timed out after ${TIMEOUT_MS / 1000}s waiting for results`));
    }, TIMEOUT_MS);
  });

  try {
    const report = await Promise.race([resultsPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    console.log(`\n3. Native Browser Results Received (${report.browser}):`);
    console.log(`   User Agent: ${report.userAgent}`);
    console.log(`   Overall Duration: ${report.durationMs.toFixed(1)}ms\n`);

    for (const suite of report.suites) {
      const statusIcon = suite.passed ? '✓' : '✗';
      const passedCount = suite.assertions.filter((a) => a.passed).length;
      console.log(
        `   ${statusIcon} ${suite.suite} (${passedCount}/${suite.assertions.length} assertions, ${suite.durationMs.toFixed(1)}ms)`
      );
      for (const assertion of suite.assertions) {
        if (!assertion.passed) {
          console.error(`      ❌ Assertion Failed: ${assertion.name}\n${assertion.error || ''}`);
        }
      }
    }

    console.log(
      `\nSummary: ${report.passedSuites}/${report.totalSuites} suites passed (${report.passedAssertions}/${report.totalAssertions} individual assertions).`
    );

    if (!report.passed || report.passedSuites !== report.totalSuites) {
      throw new Error(`One or more browser suites failed: ${report.error || 'Assertion failures'}`);
    }

    console.log('\n🎉 ALL NATIVE BROWSER INDEXEDDB TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Teardown Orca browser tab
    if (browserPageId) {
      try {
        console.log(`\nCleaning up Orca browser tab: ${browserPageId}...`);
        await execAsync(`orca tab close --page ${browserPageId} --json`);
        console.log('   ✓ Orca tab closed.');
      } catch {
        // Ignore errors during tab close
      }
    }

    // Teardown Vite server
    try {
      await viteServer.close();
      console.log('   ✓ Local test server closed.');
    } catch {
      // Ignore
    }
  }
}

runBrowserTests().catch((err) => {
  console.error('\n💥 BROWSER TEST RUNNER FAILED:', err);
  process.exit(1);
});
