import { memo, useState } from 'react';
import type {
  ExpirationUrgency,
  ExpirationUrgencyLevel,
  InventoryItem,
} from '../../../types';

/* ---- Utilities ---- */

/** Returns true if the date string is missing or produces an invalid Date. */
function isValidDate(date: string): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !Number.isNaN(d.getTime());
}

export function getExpirationUrgency(date: string): ExpirationUrgency {
  if (!isValidDate(date)) {
    return { level: 'fresh', days_until_expiration: Infinity, color: 'neutral', label: 'No expiry' };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expDate = new Date(date);
  expDate.setHours(0, 0, 0, 0);

  const diffMs = expDate.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { level: 'expired', days_until_expiration: days, color: 'danger', label: 'Expired' };
  }
  if (days <= 1) {
    return { level: 'critical', days_until_expiration: days, color: 'danger', label: days === 0 ? 'Today' : 'Tomorrow' };
  }
  if (days <= 3) {
    return { level: 'warning', days_until_expiration: days, color: 'warning', label: `${days} days` };
  }
  if (days <= 7) {
    return { level: 'good', days_until_expiration: days, color: 'success', label: `${days} days` };
  }
  return { level: 'fresh', days_until_expiration: days, color: 'neutral', label: `${days} days` };
}

export function formatDate(iso: string): string {
  if (!isValidDate(iso)) return 'No Expiry Set';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ---- Style maps ---- */

const borderColorMap: Record<ExpirationUrgencyLevel, string> = {
  expired:  'border-l-danger',
  critical: 'border-l-danger',
  warning:  'border-l-warning',
  good:     'border-l-success',
  fresh:    'border-l-neutral-300',
};

const badgeBgMap: Record<ExpirationUrgencyLevel, string> = {
  expired:  'bg-danger-light text-danger-dark',
  critical: 'bg-danger-light text-danger-dark',
  warning:  'bg-warning-light text-warning-dark',
  good:     'bg-success-light text-success-dark',
  fresh:    'bg-neutral-100 text-neutral-600',
};

const bgMap: Record<ExpirationUrgencyLevel, string> = {
  expired:  'bg-danger-light/40',
  critical: 'bg-white',
  warning:  'bg-white',
  good:     'bg-white',
  fresh:    'bg-white',
};

/* ---- Icons (inline SVGs) ---- */

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 2v4M8 2v4M3 10h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.49 2.86a1.75 1.75 0 0 1 3.02 0l6.25 10.83A1.75 1.75 0 0 1 16.25 16H3.75a1.75 1.75 0 0 1-1.51-2.31L8.49 2.86ZM10 7a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 10 7Zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---- Component ---- */

interface InventoryItemCardProps {
  item: InventoryItem;
  onClick?: () => void;
  onToggleCrossOut?: (itemId: string) => void;
}

function InventoryItemCard({
  item,
  onClick,
  onToggleCrossOut,
}: InventoryItemCardProps) {
  const urgency = getExpirationUrgency(item.expiration_date);
  const isClickable = Boolean(onClick);
  const isLowConfidence = item.confidence_score < 0.8;
  const confidencePct = Math.round(item.confidence_score * 100);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={[
        // base
        'relative flex items-center gap-4 p-4 rounded-xl',
        'border border-l-4',
        'transition-all duration-200 ease-in-out',
        // urgency
        borderColorMap[urgency.level],
        bgMap[urgency.level],
        // interactive
        isClickable && [
          'cursor-pointer',
          'hover:shadow-medium hover:border-brand-300',
          'active:scale-[0.99]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        ].join(' '),
        // expired background
        urgency.level !== 'expired' && 'border-neutral-200',
        urgency.level === 'expired' && 'border-danger/20',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Thumbnail / Fallback Avatar */}
      <div className="hidden sm:block shrink-0">
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="w-12 h-12 rounded-lg object-cover border border-neutral-200"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={[
              'w-12 h-12 rounded-lg border border-neutral-200',
              'flex items-center justify-center',
              'bg-brand-100 text-brand-600 font-bold text-lg',
              'select-none uppercase',
            ].join(' ')}
            aria-hidden="true"
          >
            {item.item_name.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Top row: name + confidence badge */}
        <div className="flex items-center gap-2">
          <h3
            className="text-base font-semibold capitalize truncate text-neutral-900"
          >
            {item.item_name}
          </h3>
          <span
            className={[
              'inline-flex items-center gap-1 shrink-0',
              'px-1.5 py-0.5 text-xs font-medium rounded-full',
              isLowConfidence
                ? 'bg-warning-light text-warning-dark border border-warning'
                : 'bg-success-light text-success-dark border border-success',
            ].join(' ')}
            aria-label={`Confidence: ${confidencePct}%`}
          >
            {isLowConfidence && <AlertIcon />}
            {confidencePct}%
          </span>
        </div>

        {/* Bottom row: date + category */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
            <CalendarIcon />
            {formatDate(item.expiration_date)}
          </span>

          {item.category && (
            <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full capitalize">
              {item.category}
            </span>
          )}

          {item.quantity && item.quantity > 1 && (
            <span className="text-xs text-neutral-400">
              Qty: {item.quantity}
            </span>
          )}
        </div>
      </div>

      {/* Days remaining badge + remove button */}
      <div className="shrink-0 flex items-center gap-2">
        {onToggleCrossOut && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCrossOut(item.id);
            }}
            className={[
              'w-6 h-6 rounded-full border-2 flex items-center justify-center',
              'transition-all duration-200 cursor-pointer',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
              'border-neutral-300 hover:border-danger hover:bg-danger-light hover:text-danger',
            ].join(' ')}
            aria-label="Remove item"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <span
          className={[
            'inline-flex items-center justify-center',
            'px-3 py-1.5 text-sm font-semibold',
            'rounded-lg',
            badgeBgMap[urgency.level],
          ].join(' ')}
        >
          {urgency.days_until_expiration === Infinity
            ? 'No expiry'
            : urgency.level === 'expired'
              ? `${Math.abs(urgency.days_until_expiration)}d ago`
              : urgency.label}
        </span>
      </div>
    </div>
  );
}

export default memo(InventoryItemCard);
