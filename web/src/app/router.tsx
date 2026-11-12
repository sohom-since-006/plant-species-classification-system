import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Layout } from '@/app/layout';
import { Home } from '@/pages/Home';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

// Route-level code splitting so non-landing pages and heavy chart dependencies are isolated
const Classify = lazy(() => import('@/pages/Classify').then((m) => ({ default: m.Classify })));
const Explore = lazy(() => import('@/pages/Explore').then((m) => ({ default: m.Explore })));
const SpeciesDetail = lazy(() => import('@/pages/SpeciesDetail').then((m) => ({ default: m.SpeciesDetail })));
const History = lazy(() => import('@/pages/History').then((m) => ({ default: m.History })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const About = lazy(() => import('@/pages/About').then((m) => ({ default: m.About })));
const Help = lazy(() => import('@/pages/Help').then((m) => ({ default: m.Help })));
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));

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
                <ProtectedRoute featureName="Field History">
                  <History />
                </ProtectedRoute>
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
    </BrowserRouter>
  );
}
