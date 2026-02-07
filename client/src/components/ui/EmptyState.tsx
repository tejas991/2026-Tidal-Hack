import { type HTMLAttributes, type ReactNode } from 'react';

/* ---- Types ---- */

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/* ---- Component ---- */

export default function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  className = '',
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        'px-6 py-12',
        className,
      ].join(' ')}
      {...rest}
    >
      {/* Illustration (takes priority over icon) */}
      {illustration ? (
        <div className="mb-5">{illustration}</div>
      ) : icon ? (
        <div
          className={[
            'mb-5 flex items-center justify-center',
            'w-16 h-16 rounded-full',
            'bg-brand-100 text-brand-600',
          ].join(' ')}
        >
          {icon}
        </div>
      ) : null}

      {/* Title */}
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mt-2 max-w-sm text-sm text-neutral-500 leading-relaxed">
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
