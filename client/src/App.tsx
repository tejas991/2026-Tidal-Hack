import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/layout/Layout';
import {
  StatsCardSkeleton,
  InventoryItemSkeleton,
} from './components/ui/LoadingSkeleton';

/* ---- React Query client ---- */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1_000, // 5 minutes
    },
  },
});

/* ---- Lazy-loaded pages ---- */

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const ShoppingListPage = lazy(() => import('./pages/ShoppingList'));
const ConnectionTestPage = lazy(() => import('./pages/ConnectionTestPage'));

/* ---- Suspense fallback ---- */

function PageFallback() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-neutral-200 animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-neutral-100 animate-pulse" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      {/* Content rows */}
      <div className="space-y-3">
        <InventoryItemSkeleton />
        <InventoryItemSkeleton />
        <InventoryItemSkeleton />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Layout>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/recipes" element={<RecipesPage />} />
                  <Route path="/shopping" element={<ShoppingListPage />} />
                  <Route path="/test-connection" element={<ConnectionTestPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
