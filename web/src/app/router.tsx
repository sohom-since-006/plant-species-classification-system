import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Layout } from '@/app/layout';
import { Home } from '@/pages/Home';
import { Classify } from '@/pages/Classify';
import { Explore } from '@/pages/Explore';
import { SpeciesDetail } from '@/pages/SpeciesDetail';
import { History } from '@/pages/History';
import { Dashboard } from '@/pages/Dashboard';
import { About } from '@/pages/About';
import { Help } from '@/pages/Help';
import { NotFound } from '@/pages/NotFound';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="classify" element={<Classify />} />
          <Route path="explore" element={<Explore />} />
          <Route path="species/:slug" element={<SpeciesDetail />} />
          <Route path="history" element={<History />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="about" element={<About />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
