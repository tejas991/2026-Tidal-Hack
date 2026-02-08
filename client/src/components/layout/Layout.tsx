import { type ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/* ---- Types ---- */

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

interface LayoutProps {
  children: ReactNode;
}

/* ---- Icons (inline SVGs) ---- */

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="7"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="12"
        width="7"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="3"
        y="16"
        width="7"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="13"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function RecipesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 7h8M8 11h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShoppingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 10a4 4 0 0 1-8 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="4"
        width="20"
        height="17"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 4V2M16 4V2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 13h4M7 16h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="14"
        r="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/* ---- Nav items ---- */

const navItems: NavItem[] = [
  { path: '/',         label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/scan',     label: 'Scan',      icon: <ScanIcon /> },
  { path: '/recipes',  label: 'Recipes',   icon: <RecipesIcon /> },
  { path: '/shopping', label: 'Shopping',  icon: <ShoppingIcon /> },
];

/* ---- Route chunk preloading ---- */

const routePreloaders: Record<string, () => void> = {
  '/':         () => { import('../../pages/Dashboard'); },
  '/scan':     () => { import('../../pages/ScanPage'); },
  '/recipes':  () => { import('../../pages/RecipesPage'); },
  '/shopping': () => { import('../../pages/ShoppingList'); },
};

/* ---- Component ---- */

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const preloadRoute = useCallback((path: string) => {
    routePreloaders[path]?.();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-50">
      {/* ── Skip link ── */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Sticky header ── */}
      <header
        className={[
          'sticky top-0 z-40',
          'flex items-center justify-between',
          'h-16 px-4 sm:px-6 lg:px-8',
          'bg-white border-b border-neutral-200',
        ].join(' ')}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="FridgeTrack — Go to dashboard"
          className={[
            'flex items-center gap-2.5',
            'text-brand-700 hover:text-brand-800',
            'transition-colors duration-150',
            'cursor-pointer',
          ].join(' ')}
        >
          <LogoIcon />
          <span className="text-lg font-bold tracking-tight">FridgeTrack</span>
        </button>
        {/* sr-only app title for screen readers */}
        <h1 className="sr-only">FridgeTrack</h1>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                onMouseEnter={() => preloadRoute(item.path)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'text-sm font-medium',
                  'transition-all duration-200 ease-in-out',
                  'cursor-pointer',
                  active
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Main content ── */}
      <main
        id="main-content"
        className={[
          'flex-1 w-full max-w-6xl mx-auto',
          'px-4 md:px-6 lg:px-8',
          'py-6 md:py-8',
          // clear mobile nav
          'pb-24 md:pb-8',
        ].join(' ')}
      >
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav
        className={[
          'fixed bottom-0 inset-x-0 z-40',
          'flex md:hidden',
          'bg-white border-t border-neutral-200',
          'pb-[env(safe-area-inset-bottom)]',
        ].join(' ')}
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              onMouseEnter={() => preloadRoute(item.path)}
              className={[
                'flex-1 flex flex-col items-center gap-1',
                'py-2.5 pt-3',
                'text-xs font-medium',
                'transition-colors duration-200',
                'cursor-pointer',
                active
                  ? 'text-brand-600'
                  : 'text-neutral-400 active:text-neutral-600',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={[
                  'flex items-center justify-center',
                  'w-10 h-7 rounded-full',
                  'transition-all duration-200',
                  active ? 'bg-brand-100' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
