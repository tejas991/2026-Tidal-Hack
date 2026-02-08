import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { InventoryItem } from '../types';
import { useInventory, useExpiringItems } from '../hooks/useInventory';
import StatsCard from '../components/features/Dashboard/StatsCard';
import InventoryItemCard from '../components/features/Inventory/InventoryItemCard';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { InventoryItemSkeleton } from '../components/ui/LoadingSkeleton';
import { env } from '../config/env';

/* ---- Constants ---- */

const USER_ID = 'demo_user';
const EXPIRING_DAYS = 7;

/* ---- Helpers ---- */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function getDaysUntil(date: string): number {
  if (!date) return Infinity;
  const exp = new Date(date);
  if (Number.isNaN(exp.getTime())) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ---- Icons (inline SVGs) ---- */

function ItemsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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


function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 20A7 7 0 0 1 4 13C4 7 12 2 20 4c2 8-3 16-9 16Zm0 0-3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 17c4-4 8-5 12-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

/* ---- Quick actions ---- */

const quickActions = [
  { path: '/scan',     label: 'Scan Fridge',   icon: <CameraIcon />, description: 'Snap a photo of your fridge' },
  { path: '/recipes',  label: 'View Recipes',  icon: <BookIcon />,   description: 'Cook with what you have' },
  { path: '/shopping', label: 'Shopping List',  icon: <CartIcon />,   description: 'Plan your next grocery trip' },
];

/* ---- Component ---- */

export default function Dashboard() {
  const navigate = useNavigate();

  // ---- Data fetching ----
  const {
    data: items = [],
    isLoading: itemsLoading,
  } = useInventory(USER_ID);

  const {
    data: expiringItems = [],
    isLoading: expiringLoading,
  } = useExpiringItems(USER_ID, EXPIRING_DAYS);

  // ---- Derived data (all computed from the live inventory array) ----
  const urgentItems = useMemo(
    () => items.filter((item: InventoryItem) => {
      const days = getDaysUntil(item.expiration_date);
      return days >= 0 && days <= 2;
    }),
    [items],
  );

  const sortedExpiringItems = useMemo(
    () => [...expiringItems].sort(
      (a, b) =>
        new Date(a.expiration_date).getTime() -
        new Date(b.expiration_date).getTime(),
    ),
    [expiringItems],
  );

  const recentItems = useMemo(
    () => [...items]
      .sort((a, b) =>
        new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime(),
      )
      .slice(0, 8),
    [items],
  );

  const uniqueCategories = useMemo(
    () => new Set(items.map((i) => i.category).filter(Boolean)).size,
    [items],
  );

  const urgentCount = urgentItems.length;

  // ---- Stats config (computed from fetched inventory) ----
  const statsConfig = [
    {
      value: formatNumber(items.length),
      label: 'Total Items',
      icon: <ItemsIcon />,
      color: 'brand' as const,
    },
    {
      value: formatNumber(expiringItems.length),
      label: 'Expiring Soon',
      icon: <WarningIcon />,
      color: expiringItems.length > 0 ? 'danger' as const : 'success' as const,
    },
    {
      value: formatNumber(uniqueCategories),
      label: 'Categories',
      icon: <LeafIcon />,
      color: 'success' as const,
    },
    {
      value: formatNumber(recentItems.length),
      label: 'Recently Added',
      icon: <CloudIcon />,
      color: 'brand' as const,
    },
  ];

  const isExpiringLoading = itemsLoading || expiringLoading;

  return (
    <div className="space-y-8">
      {/* ── Welcome ── */}
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
          Welcome back! {'\uD83D\uDC4B'}
        </h1>
        <p className="mt-1 text-neutral-500">
          Here&apos;s what&apos;s happening in your kitchen today.
        </p>
      </section>

      {/* ── Urgent Alert ── */}
      {!itemsLoading && urgentCount > 0 && (
        <div
          role="alert"
          className={[
            'flex flex-col md:flex-row md:items-center gap-3',
            'rounded-xl border-l-4 border-l-danger',
            'bg-danger-light p-4 md:p-5',
          ].join(' ')}
        >
          <span className="text-danger shrink-0">
            <WarningIcon />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger-dark">
              {urgentCount} {urgentCount === 1 ? 'item' : 'items'} expiring
              soon!
            </p>
            <p className="text-sm text-danger-dark/70 mt-0.5">
              Use them before they go to waste.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => navigate('/recipes')}
          >
            Get Recipes
          </Button>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsConfig.map((stat) => (
            <StatsCard key={stat.label} {...stat} loading={itemsLoading} />
          ))}
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className={[
                'flex flex-col items-center gap-3 p-5 md:p-6',
                'rounded-xl border border-neutral-200 bg-white',
                'min-h-[44px]',
                'transition-all duration-200 ease-in-out',
                'hover:-translate-y-0.5 hover:shadow-medium hover:border-brand-300',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                'cursor-pointer group',
              ].join(' ')}
            >
              <div
                className={[
                  'flex items-center justify-center',
                  'w-12 h-12 rounded-full',
                  'bg-brand-100 text-brand-600',
                  'group-hover:bg-brand-200',
                  'transition-colors duration-200',
                ].join(' ')}
              >
                {action.icon}
              </div>
              <div className="text-center">
                <span className="block text-sm font-semibold text-neutral-900">
                  {action.label}
                </span>
                <span className="block mt-0.5 text-xs text-neutral-500">
                  {action.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Expiring Soon ── */}
      <section>
        <Card padding="none">
          <div className="p-5 pb-0">
            <CardHeader
              title="Items Expiring Soon"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  View All
                </Button>
              }
            />
          </div>
          {isExpiringLoading ? (
            <div className="px-5 pb-5 space-y-3">
              <InventoryItemSkeleton />
              <InventoryItemSkeleton />
              <InventoryItemSkeleton />
            </div>
          ) : sortedExpiringItems.length > 0 ? (
            <div className="px-5 pb-5 space-y-3">
              {sortedExpiringItems.map((item) => (
                <InventoryItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<CheckIcon />}
                title="All clear!"
                description="No items are expiring in the next 7 days. Great job managing your food!"
              />
            </div>
          )}
        </Card>
      </section>

      {/* ── Recent Items ── */}
      <section>
        <Card padding="none">
          <div className="p-5 pb-0">
            <CardHeader
              title="Recent Items"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/scan')}
                >
                  Scan More
                </Button>
              }
            />
          </div>
          {itemsLoading ? (
            <div className="px-5 pb-5 space-y-3">
              <InventoryItemSkeleton />
              <InventoryItemSkeleton />
              <InventoryItemSkeleton />
            </div>
          ) : recentItems.length > 0 ? (
            <div className="px-5 pb-5 space-y-3">
              {recentItems.map((item) => (
                <InventoryItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<CameraIcon />}
                title="No items yet"
                description="Scan your fridge to start tracking your food inventory!"
              />
            </div>
          )}
        </Card>
      </section>

      {/* ── Dev-only: Test Connection FAB ── */}
      {env.IS_DEV && (
        <Link
          to="/test-connection"
          className={[
            'fixed bottom-6 right-6 z-50',
            'flex items-center gap-2 px-4 py-2.5',
            'rounded-full shadow-lg',
            'bg-neutral-900 text-white text-sm font-medium',
            'hover:bg-neutral-800 active:bg-neutral-950',
            'transition-all duration-200 ease-in-out',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
          ].join(' ')}
          title="Test API Connection"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Test Connection
        </Link>
      )}
    </div>
  );
}
