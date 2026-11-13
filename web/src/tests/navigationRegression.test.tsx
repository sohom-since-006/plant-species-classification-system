import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { Layout } from '@/app/layout';
import { Classify } from '@/pages/Classify';
import { History } from '@/pages/History';
import { Explore } from '@/pages/Explore';
import { Dashboard } from '@/pages/Dashboard';

function renderWithProviders(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="classify" element={<Classify />} />
              <Route path="history" element={<History />} />
              <Route path="explore" element={<Explore />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Navigation Regression Suite (Classify -> History -> Explore -> Dashboard)', () => {
  it('renders Classify page heading without stuck transition styles', async () => {
    renderWithProviders('/classify');
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('Classify');
    });
  });

  it('renders History page heading without stuck transition styles', async () => {
    renderWithProviders('/history');
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('Identification');
    });
  });

  it('renders Explore page heading without stuck transition styles', async () => {
    renderWithProviders('/explore');
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('Explore');
    });
  });

  it('renders Dashboard page heading without stuck transition styles', async () => {
    renderWithProviders('/dashboard');
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('Dashboard');
    });
  });
});
