import { type ButtonHTMLAttributes, type ReactNode } from 'react';

/* ---- Spinner ---- */
function Spinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 14, md: 16, lg: 20 }[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
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
  );
}

/* ---- Types ---- */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/* ---- Style maps ---- */

const variantStyles: Record<Variant, string> = {
  primary: [
    'bg-brand-600 text-white',
    'hover:bg-brand-700',
    'active:bg-brand-800',
  ].join(' '),

  secondary: [
    'bg-brand-100 text-brand-800',
    'hover:bg-brand-200',
    'active:bg-brand-300',
  ].join(' '),

  outline: [
    'border border-neutral-300 bg-transparent text-neutral-800',
    'hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50',
    'active:bg-brand-100',
  ].join(' '),

  ghost: [
    'bg-transparent text-neutral-700',
    'hover:bg-neutral-100 hover:text-neutral-900',
    'active:bg-neutral-200',
  ].join(' '),

  danger: [
    'bg-danger text-white',
    'hover:bg-danger-dark',
    'active:brightness-90',
  ].join(' '),
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-md',
  md: 'px-4 py-2 text-base gap-2 rounded-lg',
  lg: 'px-6 py-3 text-lg gap-2.5 rounded-lg',
};

/* ---- Component ---- */

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      aria-label={isLoading ? 'Loading, please wait' : undefined}
      className={[
        // layout
        'inline-flex items-center justify-center',
        // transitions
        'transition-all duration-200 ease-in-out',
        // focus ring — branded
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        // cursor
        'cursor-pointer',
        // disabled
        isDisabled && 'opacity-50 pointer-events-none',
        // width
        fullWidth && 'w-full',
        // variant + size
        variantStyles[variant],
        sizeStyles[size],
        // font
        'font-medium leading-none select-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Left icon or spinner */}
      {isLoading ? (
        <Spinner size={size} />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}

      {/* Label — keep in DOM while loading to stabilise width */}
      <span className={isLoading ? 'opacity-0 h-0 overflow-hidden' : undefined}>
        {children}
      </span>
      {isLoading && <span>{children}</span>}

      {/* Right icon — hide while loading */}
      {!isLoading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
