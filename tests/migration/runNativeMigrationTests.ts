/**
 * LaunchPad Native IndexedDB Migration Test Runner
 *
 * Spawns an isolated local Vite server on loopback port 0 and executes
 * native browser migration tests directly inside Orca's built-in browser engine.
 */

import { exec } from 'node:child_process';
import { AddressInfo } from 'node:net';
import { promisify } from 'node:util';
import { createServer } from 'vite';

const execAsync = promisify(exec);
const TIMEOUT_MS = 30000;

interface TestReport {
  browser: string;
  userAgent: string;
  passed: boolean;
  suites: {
    suite: string;
    passed: boolean;
    durationMs: number;
    assertions: { name: string; passed: boolean; error?: string; durationMs: number }[];
  }[];
  durationMs: number;
  error?: string;
}

async function run(): Promise<void> {
  console.log('=== Stage 2B Native IndexedDB Migration Harness ===\n');
  console.log('Environment: Orca Built-in Browser (Native window.indexedDB)');

  const workspaceRoot = process.cwd();
  let resultsReceived: (report: TestReport) => void;
  const resultsPromise = new Promise<TestReport>((resolve) => {
    resultsReceived = resolve;
  });

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
                  // Ignore
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
              req.on('data', (c) => (body += c));
              req.on('end', () => {
                try {
                  const report = JSON.parse(body);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ received: true }));
                  resultsReceived(report);
                } catch (err) {
                  res.writeHead(500);
                  res.end(String(err));
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
  console.log(`1. Local test server listening at http://127.0.0.1:${port}/`);

  const testUrl = `http://127.0.0.1:${port}/tests/migration/migration-runner.html`;
  console.log(`2. Opening test tab in Orca built-in browser: ${testUrl}`);

  let browserPageId: string | undefined;
  try {
    const { stdout: rawCreate } = await execAsync(`orca tab create --url "${testUrl}" --json`);
    const parsed = JSON.parse(rawCreate);
    browserPageId = parsed.result?.browserPageId;
    console.log(`   ✓ Orca tab created with page ID: ${browserPageId}`);
  } catch (err) {
    await viteServer.close();
    throw new Error(`Failed to create Orca browser tab: ${String(err)}`);
  }

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Native migration browser test timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);
  });

  try {
    const report = await Promise.race([resultsPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    console.log(`\n3. Native Browser Results Received (${report.browser}):`);
    console.log(`   User Agent: ${report.userAgent}`);
    console.log(`   Overall Duration: ${report.durationMs.toFixed(1)}ms\n`);

    for (const suite of report.suites) {
      const icon = suite.passed ? '✓' : '❌';
      const passedCount = suite.assertions.filter((a) => a.passed).length;
      console.log(`   ${icon} ${suite.suite} (${passedCount}/${suite.assertions.length} assertions, ${suite.durationMs.toFixed(1)}ms)`);
      for (const a of suite.assertions) {
        if (!a.passed) {
          console.error(`      ❌ Assertion Failed: ${a.name}\n${a.error || ''}`);
        }
      }
    }

    if (!report.passed) {
      console.error('\n❌ ONE OR MORE NATIVE BROWSER SUITES FAILED!');
      process.exit(1);
    }

    console.log('\n🎉 ALL NATIVE INDEXEDDB MIGRATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    if (browserPageId) {
      console.log(`Cleaning up Orca browser tab: ${browserPageId}...`);
      await execAsync(`orca tab close --page "${browserPageId}" --json`).catch(() => {});
      console.log('   ✓ Orca tab closed.');
    }
    await viteServer.close();
    console.log('   ✓ Local test server closed.');
  }
}

run().catch((err) => {
  console.error('\n❌ HARNESS ERROR:', err);
  process.exit(1);
});
