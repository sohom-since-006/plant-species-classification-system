import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axe from 'axe-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { Home } from '@/pages/Home';
import { Classify } from '@/pages/Classify';
import { Explore } from '@/pages/Explore';
import { SpeciesDetail } from '@/pages/SpeciesDetail';
import { Dashboard } from '@/pages/Dashboard';
import { History } from '@/pages/History';
import { About } from '@/pages/About';
import { Help } from '@/pages/Help';
import { NotFound } from '@/pages/NotFound';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

afterEach(() => {
  cleanup();
});

function renderWithProviders(ui: React.ReactElement, initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

// Axe helper filtering for serious and critical violations with strict mutex
let axeLock = Promise.resolve();

async function checkA11y(container: HTMLElement) {
  let releaseCurrent: () => void;
  const currentLock = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const previousLock = axeLock;
  axeLock = currentLock;

  await previousLock;
  try {
    const results = await axe.run(container, {
      rules: {
        // In JSDOM, color contrast computation can be unreliable without actual CSS layout engine
        'color-contrast': { enabled: false },
      },
    });

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    return seriousOrCritical;
  } finally {
    releaseCurrent!();
  }
}

describe('Automated Axe Accessibility Audits (Sequential Suite)', () => {
  const pages = [
    {
      name: 'Navigation & Footer',
      render: () =>
        renderWithProviders(
          <div>
            <Navbar />
            <main id="main-content">
              <h1>Main Botanical Content</h1>
            </main>
            <Footer />
          </div>,
          '/',
        ),
    },
    {
      name: 'Home Page',
      render: () => renderWithProviders(<Home />, '/'),
    },
    {
      name: 'Classify Page',
      render: () => renderWithProviders(<Classify />, '/classify'),
    },
    {
      name: 'Explore Page',
      render: () => renderWithProviders(<Explore />, '/explore'),
    },
    {
      name: 'Species Detail Page',
      render: () =>
        renderWithProviders(
          <Routes>
            <Route path="/species/:slug" element={<SpeciesDetail />} />
          </Routes>,
          '/species/mangifera-indica',
        ),
    },
    {
      name: 'Dashboard Page',
      render: () => renderWithProviders(<Dashboard />, '/dashboard'),
    },
    {
      name: 'History Page',
      render: () => renderWithProviders(<History />, '/history'),
    },
    {
      name: 'About Page',
      render: () => renderWithProviders(<About />, '/about'),
    },
    {
      name: 'Help Page',
      render: () => renderWithProviders(<Help />, '/help'),
    },
    {
      name: 'NotFound Page',
      render: () => renderWithProviders(<NotFound />, '/404'),
    },
  ];

  for (const page of pages) {
    it(`verifies ${page.name} has zero serious or critical accessibility violations`, async () => {
      const { container } = page.render();
      const violations = await checkA11y(container);
      expect(violations, `Accessibility violations in ${page.name}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
    }, 30000);
  }
});
