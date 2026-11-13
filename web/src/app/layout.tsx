import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageBackground } from '@/components/layout/PageBackground';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { pageTransition, pageTransitionReduced, usePrefersReducedMotion } from '@/lib/motion';
import { initCursorGlow } from '@/lib/cursorGlow';

export function Layout() {
  const location = useLocation();
  const prefersReduced = usePrefersReducedMotion();

  // Scroll to top on navigation without layout jump
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Global cursor glow listener for interactive [data-glow] elements
  useEffect(() => {
    const cleanup = initCursorGlow();
    return cleanup;
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <PageBackground />
      <Navbar />
      <OfflineBanner />
      <main className="flex-1 w-full relative">
        <ErrorBoundary>
          <motion.div
            key={location.pathname}
            variants={prefersReduced ? pageTransitionReduced : pageTransition}
            initial="initial"
            animate="animate"
            className="w-full h-full"
          >
            <Outlet />
          </motion.div>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
