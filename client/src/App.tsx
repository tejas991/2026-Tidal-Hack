import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/layout/Layout';
import WinterBackground from './components/WinterBackground';
import FloatingModel from './components/ui/FloatingModel'; 
import {
  StatsCardSkeleton,
  InventoryItemSkeleton,
} from './components/ui/LoadingSkeleton';

/* ---- 1. SETUP QUERY CLIENT (Fixed the red line on line 7) ---- */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1_000,
    },
  },
});

/* ---- 2. SETUP PAGE IMPORTS (Fixed the red lines in <Routes>) ---- */
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const ShoppingListPage = lazy(() => import('./pages/ShoppingList'));
const ConnectionTestPage = lazy(() => import('./pages/ConnectionTestPage'));

/* ---- 3. SETUP LOADING SCREEN (Fixed the red line on line 16) ---- */
function PageFallback() {
  return (
    <div className="space-y-8 p-8" aria-hidden="true">
      <div className="h-8 w-48 rounded-lg bg-neutral-200 animate-pulse mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WinterBackground />
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          
          {/* 3D Model sits here independently */}
          <ErrorBoundary>
            <FloatingModel />
          </ErrorBoundary>
          
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