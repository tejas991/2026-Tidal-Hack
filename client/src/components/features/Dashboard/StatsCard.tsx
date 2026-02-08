import { memo, type HTMLAttributes, type ReactNode } from 'react';

/* ---- Types ---- */

type StatsColor = 'brand' | 'success' | 'warning' | 'danger';

interface TrendIndicator {
  value: number;
  direction: 'up' | 'down';
  label?: string;
}

interface StatsCardProps extends HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: TrendIndicator;
  color?: StatsColor;
  loading?: boolean;
}

/* ---- Style maps ---- */

const iconBgMap: Record<StatsColor, string> = {
  brand:   'bg-brand-100 text-brand-600',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger:  'bg-danger-light text-danger-dark',
};

const valueColorMap: Record<StatsColor, string> = {
  brand:   'text-brand-700',
  success: 'text-success-dark',
  warning: 'text-warning-dark',
  danger:  'text-danger-dark',
};

const trendStyles: Record<'up' | 'down', string> = {
  up:   'text-success-dark bg-success-light',
  down: 'text-danger-dark bg-danger-light',
};

/* ---- Icons ---- */

function TrendUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 6l-9.5 9.5-5-5L1 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 6h6v6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 18l-9.5-9.5-5 5L1 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 18h6v-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Skeleton ---- */

function SkeletonPulse({ className }: { className: string }) {
  return (
    <div
      className={[
        'animate-pulse rounded-md bg-neutral-200',
        className,
      ].join(' ')}
    />
  );
}

/* ---- Component ---- */

function StatsCard({
  value,
  label,
  icon,
  trend,
  color = 'brand',
  loading = false,
  className = '',
  ...rest
}: StatsCardProps) {
  if (loading) {
    return (
      <div
        className={[
          'rounded-xl border border-neutral-200 bg-white p-5',
          'transition-all duration-200 ease-in-out',
          'hover:-translate-y-0.5 hover:shadow-medium',
          className,
        ].join(' ')}
        {...rest}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonPulse className="h-8 w-24" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
          <SkeletonPulse className="h-10 w-10 shrink-0 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'rounded-xl border border-neutral-200 bg-white p-5',
        'transition-all duration-200 ease-in-out',
        'hover:-translate-y-0.5 hover:shadow-medium',
        className,
      ].join(' ')}
      {...rest}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Value + label */}
        <div className="min-w-0 flex-1">
          <p className={[
            'text-3xl font-bold tracking-tight',
            valueColorMap[color],
          ].join(' ')}>
            {value}
          </p>
          <p className="mt-1 text-sm text-neutral-600">{label}</p>

          {/* Trend */}
          {trend && (
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={[
                  'inline-flex items-center gap-1 px-2 py-0.5',
                  'text-xs font-semibold rounded-full',
                  trendStyles[trend.direction],
                ].join(' ')}
                aria-label={`${trend.direction === 'up' ? 'Up' : 'Down'} ${trend.value}%${trend.label ? ` ${trend.label}` : ''}`}
              >
                {trend.direction === 'up' ? <TrendUpIcon /> : <TrendDownIcon />}
                <span aria-hidden="true">{trend.value}%</span>
              </span>
              {trend.label && (
                <span className="text-xs text-neutral-400" aria-hidden="true">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className={[
              'shrink-0 flex items-center justify-center',
              'w-10 h-10 rounded-full',
              iconBgMap[color],
            ].join(' ')}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StatsCard);
