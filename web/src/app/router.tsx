import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Layout } from '@/app/layout';
import { Home } from '@/pages/Home';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Helper to gracefully reload once if a lazy chunk failed to load (e.g. after a new deployment)
function lazyWithRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    const retryKey = 'plantai_chunk_retry';
    const hasAlreadyRetried =
      typeof window !== 'undefined' &&
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(retryKey) === 'true';

    try {
      const component = await componentImport();
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(retryKey);
      }
      return component;
    } catch (error) {
      if (!hasAlreadyRetried && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(retryKey, 'true');
        window.location.reload();
      }
      throw error;
    }
  });
}

// Route-level code splitting so non-landing pages and heavy chart dependencies are isolated
const Classify = lazyWithRetry(() => import('@/pages/Classify').then((m) => ({ default: m.Classify })));
const Explore = lazyWithRetry(() => import('@/pages/Explore').then((m) => ({ default: m.Explore })));
const SpeciesDetail = lazyWithRetry(() => import('@/pages/SpeciesDetail').then((m) => ({ default: m.SpeciesDetail })));
const History = lazyWithRetry(() => import('@/pages/History').then((m) => ({ default: m.History })));
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const About = lazyWithRetry(() => import('@/pages/About').then((m) => ({ default: m.About })));
const Help = lazyWithRetry(() => import('@/pages/Help').then((m) => ({ default: m.Help })));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));

function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" aria-live="polite">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route
              path="classify"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <Classify />
                </Suspense>
              }
            />
            <Route
              path="explore"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <Explore />
                </Suspense>
              }
            />
            <Route
              path="species/:slug"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <SpeciesDetail />
                </Suspense>
              }
            />
            <Route
              path="history"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <History />
                </Suspense>
              }
            />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="about"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <About />
                </Suspense>
              }
            />
            <Route
              path="help"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <Help />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
