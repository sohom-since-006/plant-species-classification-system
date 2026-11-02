import { Outlet, useLocation } from 'react-router-dom';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageBackground } from '@/components/layout/PageBackground';

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="relative min-h-screen flex flex-col">
      <PageBackground />
      <Navbar />
      <main className={`flex-1 ${isHome ? 'pt-0' : 'pt-24'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
