import { useHealthCheck } from '../../hooks/useHealth';

/* ============================================
 * FridgeTrack — Health Check Component
 * ============================================
 * Test button that pings the backend's /health
 * endpoint and displays connection status.
 * ============================================ */

export default function HealthCheck() {
  const { data, error, isFetching, refetch } = useHealthCheck();

  const statusColor = data
    ? 'bg-success-light text-success-dark'
    : error
      ? 'bg-danger-light text-danger-dark'
      : 'bg-neutral-100 text-neutral-600';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Backend Connection
          </h3>
          <p className="mt-0.5 text-sm text-neutral-500">
            Verify the API server is reachable
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className={[
            'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
            isFetching
              ? 'cursor-not-allowed bg-neutral-200 text-neutral-400'
              : 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
          ].join(' ')}
        >
          {isFetching ? 'Checking\u2026' : 'Test Connection'}
        </button>
      </div>

      {/* Result panel */}
      {(data || error) && (
        <div className={['mt-4 rounded-lg p-4 text-sm', statusColor].join(' ')}>
          {error && (
            <p className="font-medium">
              Connection failed: {error.message}
            </p>
          )}

          {data && (
            <div className="space-y-2">
              <p className="font-medium">
                Status: {data.status} &mdash; Database: {data.database}
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-xs">
                <li>Food detector: {data.components.food_detector}</li>
                <li>Date extractor: {data.components.date_extractor}</li>
                <li>Gemini AI: {data.components.gemini}</li>
              </ul>
              <p className="text-xs opacity-75">
                Checked at {new Date(data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
