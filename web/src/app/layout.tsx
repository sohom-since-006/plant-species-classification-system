import { Outlet } from 'react-router-dom';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageBackground } from '@/components/layout/PageBackground';

export function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <PageBackground />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
