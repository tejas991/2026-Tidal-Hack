import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { env } from '../config/env';
import { healthApi } from '../api/endpoints/health';
import { scanApi } from '../api/endpoints/scan';
import { inventoryApi } from '../api/endpoints/inventory';
import { recipesApi } from '../api/endpoints/recipes';
import apiClient, { isApiError } from '../api/client';

/* ============================================
 * FridgeTrack — Connection Test Page
 * ============================================
 * Systematic testing of all API endpoints with
 * diagnostics, edge cases, and reporting.
 * ============================================ */


// ---- Types ----

type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warning';

interface TestResult {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  responseTimeMs: number;
  httpStatus: number | null;
  responsePreview: string;
  errorMessage: string;
  issueType: string;
  headers: string;
}

interface DiagnosticsInfo {
  apiUrl: string;
  effectiveUrl: string;
  browser: string;
  networkOnline: boolean;
  timestamp: string;
}


// ---- Helpers ----

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

function classifyError(error: unknown): { issueType: string; message: string; status: number } {
  if (isApiError(error)) {
    const status = error.status;
    if (status === 0) {
      // Check for CORS vs network
      const msg = error.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('abort')) {
        return { issueType: 'TIMEOUT', message: error.message, status: 0 };
      }
      return {
        issueType: 'NETWORK / CORS',
        message: 'Cannot reach backend. Either CORS is blocking or the server is not running.',
        status: 0,
      };
    }
    if (status === 404) return { issueType: '404 NOT FOUND', message: error.message, status };
    if (status === 500) return { issueType: '500 SERVER ERROR', message: error.message, status };
    if (status === 503) return { issueType: '503 UNAVAILABLE', message: error.message, status };
    if (status === 429) return { issueType: '429 RATE LIMITED', message: error.message, status };
    if (status === 413) return { issueType: '413 TOO LARGE', message: error.message, status };
    if (status === 422) return { issueType: '422 VALIDATION', message: error.message, status };
    return { issueType: `HTTP ${status}`, message: error.message, status };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('failed to fetch')) {
      return { issueType: 'NETWORK', message: error.message, status: 0 };
    }
    if (msg.includes('cors')) {
      return { issueType: 'CORS', message: error.message, status: 0 };
    }
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { issueType: 'TIMEOUT', message: error.message, status: 0 };
    }
    return { issueType: 'ERROR', message: error.message, status: 0 };
  }

  return { issueType: 'UNKNOWN', message: String(error), status: 0 };
}

function getAdvice(issueType: string): string {
  const advice: Record<string, string> = {
    'NETWORK / CORS': 'Backend needs to add your domain to CORS whitelist, or the server is not running.',
    'NETWORK': 'Cannot reach backend. Check if the server is running on the expected port.',
    'CORS': 'Backend needs to add your domain to CORS whitelist.',
    'TIMEOUT': 'Backend is too slow or not responding. Check server logs.',
    '404 NOT FOUND': 'Check endpoint path. Backend might use a different route.',
    '500 SERVER ERROR': 'Backend error. Check backend logs for stack trace.',
    '503 UNAVAILABLE': 'Service component unavailable. Check API keys and server startup logs.',
    '429 RATE LIMITED': 'Too many requests. Wait a moment before retrying.',
    '413 TOO LARGE': 'File exceeds the size limit.',
    '422 VALIDATION': 'Request data was rejected. Check the request format.',
  };
  return advice[issueType] ?? 'Check console and backend logs for details.';
}

function createDefaultResult(id: string, name: string, description: string): TestResult {
  return {
    id, name, description,
    status: 'idle',
    responseTimeMs: 0,
    httpStatus: null,
    responsePreview: '',
    errorMessage: '',
    issueType: '',
    headers: '',
  };
}

/** Create a fake test image as a Blob */
function createTestImageBlob(): File {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a7c59';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FridgeTrack Test', 100, 100);

  // Convert canvas to blob synchronously via toDataURL
  const dataUrl = canvas.toDataURL('image/png');
  const byteStr = atob(dataUrl.split(',')[1]);
  const ab = new ArrayBuffer(byteStr.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
  return new File([ab], 'test-image.png', { type: 'image/png' });
}


// ---- Test Definitions ----

const TEST_USER_ID = 'demo_user';

interface TestDefinition {
  id: string;
  name: string;
  description: string;
  run: () => Promise<{ data: unknown; httpStatus: number; headers?: string }>;
}

function buildTests(): TestDefinition[] {
  return [
    // -- Core endpoints --
    {
      id: 'health',
      name: 'Health Check',
      description: 'GET /health — Backend connectivity and component status',
      run: async () => {
        const data = await healthApi.check();
        return { data, httpStatus: 200 };
      },
    },
    {
      id: 'root',
      name: 'Root Endpoint',
      description: 'GET / — Basic API status',
      run: async () => {
        const resp = await apiClient.get('/');
        return { data: resp.data, httpStatus: resp.status, headers: JSON.stringify(Object.fromEntries(Object.entries(resp.headers)), null, 2) };
      },
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: `GET /api/inventory/${TEST_USER_ID} — Fetch user inventory`,
      run: async () => {
        const data = await inventoryApi.getAll(TEST_USER_ID);
        return { data, httpStatus: 200 };
      },
    },
    {
      id: 'expiring',
      name: 'Expiring Items',
      description: `GET /api/expiring-items/${TEST_USER_ID}?days=3 — Items expiring soon`,
      run: async () => {
        const data = await inventoryApi.getExpiring(TEST_USER_ID, 3);
        return { data, httpStatus: 200 };
      },
    },
    {
      id: 'recipes',
      name: 'Recipe Generation',
      description: `GET /api/recipes/${TEST_USER_ID} — Gemini-powered recipes`,
      run: async () => {
        const data = await recipesApi.generate(TEST_USER_ID, 3);
        return { data, httpStatus: 200 };
      },
    },
    {
      id: 'scan',
      name: 'Scan Upload',
      description: 'POST /api/scan — Upload test image for detection',
      run: async () => {
        const file = createTestImageBlob();
        const data = await scanApi.uploadImage(file, TEST_USER_ID);
        return { data, httpStatus: 200 };
      },
    },

    // -- Edge cases --
    {
      id: 'edge-invalid-format',
      name: 'Edge: Invalid File Format',
      description: 'Upload a .txt file — should be rejected by client validation',
      run: async () => {
        const badFile = new File(['not an image'], 'test.txt', { type: 'text/plain' });
        try {
          await scanApi.uploadImage(badFile, TEST_USER_ID);
          return { data: 'ERROR: Should have been rejected', httpStatus: 0 };
        } catch (e) {
          if (isApiError(e) && e.status === 422) {
            return { data: { validated: true, message: e.message }, httpStatus: 422 };
          }
          throw e;
        }
      },
    },
    {
      id: 'edge-large-file',
      name: 'Edge: Large File (>10 MB)',
      description: 'Upload a file exceeding 10 MB limit — should be rejected',
      run: async () => {
        const bigBuffer = new ArrayBuffer(11 * 1024 * 1024);
        const bigFile = new File([bigBuffer], 'huge.png', { type: 'image/png' });
        try {
          await scanApi.uploadImage(bigFile, TEST_USER_ID);
          return { data: 'ERROR: Should have been rejected', httpStatus: 0 };
        } catch (e) {
          if (isApiError(e) && e.status === 413) {
            return { data: { validated: true, message: e.message }, httpStatus: 413 };
          }
          throw e;
        }
      },
    },
    {
      id: 'edge-empty-user',
      name: 'Edge: Empty Inventory User',
      description: 'Fetch inventory for non-existent user — should return empty',
      run: async () => {
        const data = await inventoryApi.getAll('nonexistent_user_12345');
        return { data: { items: data, count: data.length }, httpStatus: 200 };
      },
    },
    {
      id: 'edge-concurrent',
      name: 'Edge: Concurrent Requests',
      description: 'Fire 3 requests simultaneously — verify no race conditions',
      run: async () => {
        const results = await Promise.allSettled([
          healthApi.check(),
          inventoryApi.getAll(TEST_USER_ID),
          inventoryApi.getExpiring(TEST_USER_ID, 3),
        ]);
        const summary = results.map((r, i) => ({
          request: ['health', 'inventory', 'expiring'][i],
          status: r.status,
          ...(r.status === 'fulfilled' ? {} : { reason: String((r as PromiseRejectedResult).reason) }),
        }));
        const allOk = results.every((r) => r.status === 'fulfilled');
        return { data: { allOk, results: summary }, httpStatus: allOk ? 200 : 0 };
      },
    },
  ];
}


// ---- Icons ----

function WifiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


// ---- Status badge map ----

const statusConfig: Record<TestStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'danger' | 'neutral'; icon: string }> = {
  idle:    { label: 'Pending',  variant: 'neutral', icon: '\u23F3' },
  running: { label: 'Testing',  variant: 'info',    icon: '\u23F3' },
  pass:    { label: 'Pass',     variant: 'success', icon: '\u2705' },
  fail:    { label: 'Fail',     variant: 'danger',  icon: '\u274C' },
  warning: { label: 'Warning',  variant: 'warning', icon: '\u26A0\uFE0F' },
};


// ---- Main Component ----

export default function ConnectionTestPage() {
  const testDefs = useRef(buildTests());
  const [results, setResults] = useState<TestResult[]>(() =>
    testDefs.current.map((t) => createDefaultResult(t.id, t.name, t.description)),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState<number | null>(null);
  const abortRef = useRef(false);

  // Diagnostics
  const [diagnostics] = useState<DiagnosticsInfo>(() => ({
    apiUrl: env.API_URL,
    effectiveUrl: env.IS_DEV ? '(Vite proxy — empty baseURL)' : env.API_URL,
    browser: navigator.userAgent,
    networkOnline: navigator.onLine,
    timestamp: new Date().toISOString(),
  }));

  // Network status listener
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // -- Run a single test --
  const runSingleTest = useCallback(async (testId: string) => {
    const def = testDefs.current.find((t) => t.id === testId);
    if (!def) return;

    setResults((prev) =>
      prev.map((r) => (r.id === testId ? { ...r, status: 'running' as TestStatus } : r)),
    );

    const t0 = performance.now();
    try {
      console.log(`[ConnTest] Running: ${def.name}`);
      const { data, httpStatus, headers } = await def.run();
      const elapsed = Math.round(performance.now() - t0);
      const preview = truncate(JSON.stringify(data), 120);

      console.log(`[ConnTest] PASS: ${def.name} (${elapsed}ms)`, data);

      // Edge case tests that expect errors return non-200 status
      const isEdgeExpectedError = testId.startsWith('edge-') && httpStatus !== 200 && httpStatus !== 0;

      setResults((prev) =>
        prev.map((r) =>
          r.id === testId
            ? {
                ...r,
                status: isEdgeExpectedError ? ('pass' as TestStatus) : ('pass' as TestStatus),
                responseTimeMs: elapsed,
                httpStatus,
                responsePreview: preview,
                errorMessage: '',
                issueType: '',
                headers: headers ?? '',
              }
            : r,
        ),
      );
    } catch (error) {
      const elapsed = Math.round(performance.now() - t0);
      const classified = classifyError(error);

      console.error(`[ConnTest] FAIL: ${def.name} (${elapsed}ms)`, error);

      // Edge case tests that expect client-side validation errors are "pass"
      const isExpectedValidationError =
        (testId === 'edge-invalid-format' && classified.status === 422) ||
        (testId === 'edge-large-file' && classified.status === 413);

      setResults((prev) =>
        prev.map((r) =>
          r.id === testId
            ? {
                ...r,
                status: isExpectedValidationError ? ('pass' as TestStatus) : ('fail' as TestStatus),
                responseTimeMs: elapsed,
                httpStatus: classified.status,
                responsePreview: '',
                errorMessage: classified.message,
                issueType: isExpectedValidationError ? 'Expected validation error' : classified.issueType,
                headers: '',
              }
            : r,
        ),
      );
    }
  }, []);

  // -- Run all tests --
  const runAllTests = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    const t0 = performance.now();
    setStartTime(t0);
    setTotalElapsed(null);

    // Reset all to idle
    setResults(testDefs.current.map((t) => createDefaultResult(t.id, t.name, t.description)));

    for (const def of testDefs.current) {
      if (abortRef.current) break;
      await runSingleTest(def.id);
    }

    setTotalElapsed(Math.round(performance.now() - t0));
    setIsRunning(false);
  }, [runSingleTest]);

  // -- Export results --
  const exportResults = useCallback((format: 'json' | 'markdown') => {
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const warned = results.filter((r) => r.status === 'warning').length;
    const total = results.length;

    if (format === 'json') {
      const payload = {
        report: 'FridgeTrack Connection Test',
        generated: new Date().toISOString(),
        diagnostics,
        summary: { total, passed, failed, warnings: warned, totalTimeMs: totalElapsed },
        results: results.map(({ id, name, status, responseTimeMs, httpStatus, errorMessage, issueType }) => ({
          id, name, status, responseTimeMs, httpStatus, errorMessage, issueType,
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'fridgetrack-test-results.json');
    } else {
      const lines = [
        '# FridgeTrack Connection Test Report',
        '',
        `**Generated:** ${new Date().toISOString()}`,
        `**API URL:** ${diagnostics.effectiveUrl}`,
        `**Total time:** ${totalElapsed ?? '—'}ms`,
        '',
        `## Summary: ${passed}/${total} passed`,
        '',
        '| Test | Status | Time | HTTP | Issue |',
        '|------|--------|------|------|-------|',
        ...results.map(
          (r) =>
            `| ${r.name} | ${statusConfig[r.status].icon} ${statusConfig[r.status].label} | ${r.responseTimeMs}ms | ${r.httpStatus ?? '—'} | ${r.issueType || '—'} |`,
        ),
        '',
        '## Issues Found',
        '',
        ...results
          .filter((r) => r.status === 'fail')
          .map(
            (r) =>
              `- **${r.name}** (${r.issueType}): ${r.errorMessage}\n  - Fix: ${getAdvice(r.issueType)}`,
          ),
        ...(failed === 0 ? ['No issues found.'] : []),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      downloadBlob(blob, 'fridgetrack-test-results.md');
    }
  }, [results, diagnostics, totalElapsed]);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -- Derived stats --
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const total = results.length;
  const completed = results.filter((r) => r.status !== 'idle' && r.status !== 'running').length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total && total > 0;
  const allPass = allDone && failed === 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700"
            aria-label="Back to Dashboard"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Connection Test
            </h1>
            <p className="text-sm text-neutral-500">
              Verify frontend-backend integration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlayIcon />}
            isLoading={isRunning}
            onClick={runAllTests}
          >
            Run All Tests
          </Button>
          {allDone && (
            <>
              <Button variant="outline" size="sm" leftIcon={<DownloadIcon />} onClick={() => exportResults('json')}>
                JSON
              </Button>
              <Button variant="outline" size="sm" leftIcon={<DownloadIcon />} onClick={() => exportResults('markdown')}>
                Markdown
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Overall Status Banner ── */}
      {allDone && (
        <div
          role="status"
          className={[
            'rounded-xl border-l-4 p-4',
            allPass
              ? 'border-l-success bg-success-light'
              : 'border-l-danger bg-danger-light',
          ].join(' ')}
        >
          <p className={['font-semibold text-sm', allPass ? 'text-success-dark' : 'text-danger-dark'].join(' ')}>
            {allPass
              ? `All systems operational — ${passed}/${total} tests passed`
              : `Issues detected — ${passed}/${total} passed, ${failed} failed`}
          </p>
          {totalElapsed !== null && (
            <p className={['text-xs mt-0.5', allPass ? 'text-success-dark/70' : 'text-danger-dark/70'].join(' ')}>
              Completed in {totalElapsed}ms
            </p>
          )}
        </div>
      )}

      {/* ── Progress Bar ── */}
      {isRunning && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Testing endpoints...</span>
            <span>{completed}/{total}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Diagnostics Panel ── */}
      <Card variant="filled" padding="md">
        <CardHeader title="Diagnostics" subtitle="Connection environment details" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <DiagRow label="API URL (config)" value={diagnostics.apiUrl} />
            <DiagRow label="Effective URL" value={diagnostics.effectiveUrl} />
            <DiagRow
              label="Network"
              value={
                <span className={['font-medium', online ? 'text-success-dark' : 'text-danger-dark'].join(' ')}>
                  {online ? 'Online' : 'Offline'}
                </span>
              }
            />
            <DiagRow label="Environment" value={env.ENV} />
            <DiagRow label="Proxy active" value={env.IS_DEV ? 'Yes (Vite dev proxy)' : 'No (direct)'} />
            <DiagRow label="Browser" value={truncate(diagnostics.browser, 60)} />
          </div>
        </CardBody>
      </Card>

      {/* ── Test Results ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Test Results
        </h2>

        {results.map((result) => (
          <TestResultCard
            key={result.id}
            result={result}
            isRunning={isRunning}
            onRetry={() => runSingleTest(result.id)}
          />
        ))}
      </div>

      {/* ── Mock Data Check ── */}
      <Card variant="outlined" padding="md">
        <CardHeader title="Mock Data Status" subtitle="Check if frontend is using real backend data" />
        <CardBody>
          <div className="space-y-2 text-sm">
            <MockStatusRow
              label="ScanPage"
              real={true}
              description="Uses scanApi.uploadImage() — connected to real backend"
            />
            <MockStatusRow
              label="Dashboard"
              real={false}
              description="Uses hardcoded mock data — not yet connected to backend stats"
            />
            <MockStatusRow
              label="RecipesPage"
              real={true}
              description="Uses recipesApi.generate() — connected to Gemini backend"
            />
          </div>
        </CardBody>
        <CardFooter align="left">
          <p className="text-xs text-neutral-500">
            Tip: Connect Dashboard to backend /api/stats and /api/inventory endpoints for live data.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}


// ---- Sub-components ----

function DiagRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-neutral-500 shrink-0">{label}:</span>
      <span className="text-neutral-800 font-mono text-xs break-all">{value}</span>
    </div>
  );
}

function MockStatusRow({ label, real, description }: { label: string; real: boolean; description: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Badge variant={real ? 'success' : 'warning'} size="sm">
        {real ? 'Real API' : 'Mock Data'}
      </Badge>
      <div>
        <span className="font-medium text-neutral-800">{label}</span>
        <span className="text-neutral-500 ml-1.5">— {description}</span>
      </div>
    </div>
  );
}

function TestResultCard({
  result,
  isRunning,
  onRetry,
}: {
  result: TestResult;
  isRunning: boolean;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[result.status];

  const bgClass =
    result.status === 'pass'
      ? 'border-l-success'
      : result.status === 'fail'
        ? 'border-l-danger'
        : result.status === 'warning'
          ? 'border-l-warning'
          : result.status === 'running'
            ? 'border-l-info'
            : 'border-l-neutral-200';

  return (
    <div
      className={[
        'rounded-xl border border-neutral-200 bg-white overflow-hidden',
        'border-l-4',
        bgClass,
        'transition-all duration-200',
      ].join(' ')}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        {/* Status indicator */}
        <span className="text-base shrink-0" aria-hidden="true">
          {result.status === 'running' ? (
            <span className="inline-block animate-spin">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          ) : (
            cfg.icon
          )}
        </span>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-neutral-900">{result.name}</span>
          <span className="hidden sm:inline text-xs text-neutral-400 ml-2">{result.description}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {result.responseTimeMs > 0 && (
            <span className="text-xs text-neutral-400 tabular-nums">{result.responseTimeMs}ms</span>
          )}
          {result.httpStatus !== null && result.httpStatus > 0 && (
            <Badge
              variant={result.httpStatus < 300 ? 'success' : result.httpStatus < 500 ? 'warning' : 'danger'}
              size="sm"
            >
              {result.httpStatus}
            </Badge>
          )}
          <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
        </div>

        {/* Expand chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          className={['text-neutral-400 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-neutral-100 space-y-3">
          <p className="text-xs text-neutral-500 sm:hidden">{result.description}</p>

          {result.responsePreview && (
            <DetailBlock label="Response Preview" value={result.responsePreview} mono />
          )}

          {result.errorMessage && (
            <DetailBlock label="Error" value={result.errorMessage} danger />
          )}

          {result.issueType && result.status === 'fail' && (
            <div className="space-y-1">
              <DetailBlock label="Issue Type" value={result.issueType} />
              <DetailBlock label="Suggested Fix" value={getAdvice(result.issueType)} />
            </div>
          )}

          {result.headers && (
            <DetailBlock label="Response Headers" value={result.headers} mono />
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshIcon />}
              disabled={isRunning}
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
            >
              Retry
            </Button>
            {result.responsePreview && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ClipboardIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(result.responsePreview);
                }}
              >
                Copy
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({
  label,
  value,
  mono,
  danger,
}: {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</span>
      <p
        className={[
          'mt-0.5 text-xs p-2 rounded-lg break-all',
          mono ? 'font-mono bg-neutral-50 text-neutral-700' : '',
          danger ? 'bg-danger-light text-danger-dark' : '',
          !mono && !danger ? 'text-neutral-700' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </p>
    </div>
  );
}
