import { type HTMLAttributes, type ReactNode } from 'react';

/* ---- Types ---- */

type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Makes the card a clickable surface with hover/focus states */
  interactive?: boolean;
  /** Full-width on mobile, constrained on larger screens */
  fullWidth?: boolean;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Right-aligns footer content (e.g. action buttons) */
  align?: 'left' | 'right' | 'between';
}

/* ---- Style maps ---- */

const variantStyles: Record<CardVariant, string> = {
  default:  'bg-white border border-neutral-200',
  outlined: 'bg-transparent border border-neutral-300',
  elevated: 'bg-white border border-neutral-100 shadow-medium',
  filled:   'bg-neutral-100 border border-transparent',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
};

const footerAlign: Record<NonNullable<CardFooterProps['align']>, string> = {
  left:    'justify-start',
  right:   'justify-end',
  between: 'justify-between',
};

/* ---- Components ---- */

export default function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  fullWidth = false,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-xl overflow-hidden',
        'transition-all duration-200 ease-in-out',
        variantStyles[variant],
        paddingStyles[padding],
        interactive && [
          'cursor-pointer',
          'hover:shadow-medium hover:border-brand-300',
          'active:scale-[0.99]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        ].join(' '),
        fullWidth && 'w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---- Sub-components ---- */

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
  ...rest
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 mb-4 ${className}`}
      {...rest}
    >
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-neutral-900 truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-neutral-700 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  align = 'right',
  children,
  className = '',
  ...rest
}: CardFooterProps) {
  return (
    <div
      className={[
        'flex items-center gap-3 mt-5 pt-4 border-t border-neutral-200',
        footerAlign[align],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
