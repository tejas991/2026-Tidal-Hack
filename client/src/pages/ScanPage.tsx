import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { InventoryItem, BackendDetectionResult } from '../types';
import { scanApi } from '../api/endpoints/scan';
import { isApiError } from '../api/client';
import ImageUpload from '../components/features/Scanner/ImageUpload';
import InventoryItemCard from '../components/features/Inventory/InventoryItemCard';
import Button from '../components/ui/Button';

/* ---- Types ---- */

type ScanStatus = 'idle' | 'processing' | 'success' | 'error';
type ErrorType = 'network' | 'server' | 'no_items';

/* ---- Helpers ---- */

/** Map a backend detection result to a frontend InventoryItem for display. */
function mapDetectionToItem(det: BackendDetectionResult, index: number): InventoryItem {
  return {
    id: `scan-${index}`,
    user_id: 'demo_user',
    item_name: det.item_name,
    expiration_date: det.expiration_date ?? '',
    detected_at: new Date().toISOString(),
    confidence_score: det.confidence,
    quantity: 1,
  };
}

/* ---- Error config ---- */

const errorMessages: Record<ErrorType, { title: string; description: string }> = {
  network:  { title: 'Connection failed',      description: 'Check your internet connection and try again.' },
  server:   { title: 'Something went wrong',    description: 'Our servers are having trouble. Please try again in a moment.' },
  no_items: { title: 'No items detected',       description: 'We couldn\u2019t find any food items. Try better lighting or a different angle.' },
};

/* ---- Real API upload ---- */

async function uploadImage(
  file: File,
  onProgress: (pct: number) => void,
): Promise<InventoryItem[]> {
  const response = await scanApi.uploadImage(file, 'demo_user', onProgress);
  return response.items_detected.map(mapDetectionToItem);
}

/* ---- Icons (inline SVGs) ---- */

function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 4 12 14.01l-3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v4M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 4v6h6M23 20v-6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Skeleton card ---- */

function SkeletonCard() {
  return (
    <div
      className={[
        'flex items-center gap-4 p-4 rounded-xl',
        'border border-l-4 border-neutral-200 border-l-neutral-300',
        'bg-slate-950/60 backdrop-blur-2xl animate-pulse',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="h-5 w-32 rounded-md bg-neutral-200" />
        <div className="h-4 w-48 rounded-md bg-neutral-200" />
      </div>
      <div className="h-8 w-16 rounded-lg bg-neutral-200 shrink-0" />
    </div>
  );
}

/* ---- Component ---- */

export default function ScanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [detectedItems, setDetectedItems] = useState<InventoryItem[]>([]);
  const [errorType, setErrorType] = useState<ErrorType>('network');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Track if the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  /* ---- Handlers ---- */

  const handleUpload = useCallback(async (file: File) => {
    console.log('[ScanPage] handleUpload called, file:', file.name, file.size, file.type);
    setStatus('processing');
    setDetectedItems([]);
    setErrorDetail(null);

    let succeeded = false;

    try {
      console.log('[ScanPage] Calling uploadImage...');
      const items = await uploadImage(file, () => {});

      if (items.length === 0) {
        setErrorType('no_items');
        setErrorDetail('We couldn\u2019t find any food items. Try better lighting or a different angle.');
        return; // finally will set status to 'error'
      }

      setDetectedItems(items);
      succeeded = true;

      // Invalidate inventory queries to trigger automatic refresh in Dashboard
      queryClient.invalidateQueries({ queryKey: ['inventory', 'demo_user'] });
      queryClient.invalidateQueries({ queryKey: ['expiring', 'demo_user'] });

      setStatus('success');
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      console.error('[ScanPage] Upload failed:', error);

      // Extract the backend detail message (e.g. "No items detected. Try getting closer...")
      try {
        if (isApiError(error)) {
          const detail = typeof error.data === 'object' && error.data !== null && 'detail' in error.data
            ? String((error.data as { detail: unknown }).detail)
            : error.message;

          if (error.status === 400) {
            setErrorType('no_items');
            setErrorDetail(detail);
          } else if (error.status === 408) {
            setErrorType('no_items');
            setErrorDetail(detail || 'Processing took too long. The image may be invalid. Try a clearer photo.');
          } else if (error.status === 0) {
            setErrorType('network');
          } else {
            setErrorType('server');
            setErrorDetail(detail);
          }
        } else {
          setErrorType('network');
        }
      } catch {
        // If detail extraction itself fails, fall back to generic server error
        setErrorType('server');
      }
    } finally {
      if (!mountedRef.current) return;
      if (!succeeded) {
        setStatus('error');
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setDetectedItems([]);
    setErrorDetail(null);
  }, []);

  /* ---- Render: Processing ---- */

  if (status === 'processing') {
    return (
      <div className="space-y-8">
        <PageHeader />
        <div className="space-y-6">
          {/* Spinner + message */}
          <div className="flex flex-col items-center gap-4 py-8">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              className="animate-spin text-brand-500"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm font-medium text-slate-200">
              Analyzing your fridge…
            </p>
            <p className="text-xs text-slate-200">
              This usually takes a few seconds
            </p>
          </div>

          {/* Skeleton cards */}
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render: Success ---- */

  if (status === 'success') {
    return (
      <div className="space-y-8">
        <PageHeader />

        {/* Success banner */}
        <div
          className={[
            'flex items-center gap-3 p-4 rounded-xl',
            'bg-success-light border border-success/30',
          ].join(' ')}
          role="status"
        >
          <span className="text-success-dark shrink-0">
            <CheckCircleIcon />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-success-dark">
              Found {detectedItems.length} {detectedItems.length === 1 ? 'item' : 'items'}!
            </p>
            <p className="text-sm text-success-dark/70 mt-0.5">
              These items have been added to your inventory.
            </p>
          </div>
        </div>

        {/* Detected items */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            Detected Items
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {detectedItems.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* Action buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <Button
            variant="primary"
            onClick={handleReset}
            leftIcon={<RefreshIcon />}
            className="w-full md:w-auto min-h-[44px]"
          >
            Scan Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            leftIcon={<InventoryIcon />}
            className="w-full md:w-auto min-h-[44px]"
          >
            View Inventory
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Render: Error ---- */

  if (status === 'error') {
    const err = errorMessages[errorType];
    return (
      <div className="space-y-8">
        <PageHeader />

        <div className="flex flex-col items-center gap-5 py-12">
          {/* Icon */}
          <div
            className={[
              'flex items-center justify-center',
              'w-16 h-16 rounded-full',
              'bg-danger-light text-danger',
            ].join(' ')}
          >
            <AlertTriangleIcon />
          </div>

          {/* Message */}
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-semibold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {err.title}
            </h2>
            <p className="mt-2 text-sm text-sky-100 leading-relaxed">
              {errorDetail ?? err.description}
            </p>
          </div>

          {/* Retry */}
          <Button
            variant="primary"
            onClick={handleReset}
            leftIcon={<RefreshIcon />}
            className="min-h-[44px]"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Render: Idle (default) ---- */

  return (
    <div className="space-y-8">
      <PageHeader />

      {/* Image upload — large & prominent */}
      <section className="md:max-w-2xl md:mx-auto">
        <ImageUpload onUpload={handleUpload} />
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-sm font-semibold text-sky-100 uppercase tracking-wider mb-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          Tips for best results
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tips.map((tip) => (
            <div
              key={tip.title}
              className={[
                'flex items-start gap-3 p-4',
                'rounded-xl border border-neutral-200 bg-slate-950/60 backdrop-blur-2xl',
              ].join(' ')}
            >
              <span className="shrink-0 text-brand-500 mt-0.5">{tip.icon}</span>
              <div>
                <p className="text-sm font-medium text-white">{tip.title}</p>
                <p className="mt-0.5 text-xs text-slate-200">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---- Page header (shared across states) ---- */

function PageHeader() {
  return (
    <section>
      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        Scan Your Fridge
      </h1>
      <p className="mt-1 text-sky-100">
        Take a photo of your fridge and we&apos;ll detect the items inside.
      </p>
    </section>
  );
}

/* ---- Tips ---- */

function LightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 3H3v2M21 3h-2M3 21h2M19 21h2M3 7v4M3 13v4M21 7v4M21 13v4M7 3h4M13 3h4M7 21h4M13 21h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="2"
        width="14"
        height="20"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M13 11v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const tips = [
  {
    icon: <LightIcon />,
    title: 'Good lighting',
    description: 'Make sure your fridge is well-lit for accurate detection.',
  },
  {
    icon: <FrameIcon />,
    title: 'Full view',
    description: 'Capture all shelves and compartments in a single photo.',
  },
  {
    icon: <DoorIcon />,
    title: 'Open door wide',
    description: 'Open the fridge door fully so items are clearly visible.',
  },
];
