import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Home } from '@/pages/Home';

describe('Landing Page & Layout Components', () => {
  it('renders Navbar with links and CTA', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>,
    );

    expect(screen.getByLabelText(/Plant Species Classification System Home/i)).toBeInTheDocument();
    expect(screen.getAllByText('Identify').length).toBeGreaterThan(0);
  });

  it('renders Footer with disclaimers and credits', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Identification is probabilistic/i)).toBeInTheDocument();
    expect(screen.getByText(/GBIF/i)).toBeInTheDocument();
    expect(screen.getByText(/iNaturalist/i)).toBeInTheDocument();
  });

  it('renders Home page with headline and tagline', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Know Every Plant You Meet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Start Identifying/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Plant science/i)).toBeInTheDocument();
    expect(screen.getByText(/Three steps from leaf to insight/i)).toBeInTheDocument();
  });

  it('renders PageHero with synchronized title and badge', () => {
    render(
      <BrowserRouter>
        <PageHero
          badge="TEST BADGE"
          title="Test Page Title"
          italicSubtitle="Botanical Subtitle"
          description="Test description text"
        />
      </BrowserRouter>,
    );

    expect(screen.getByText('TEST BADGE')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Botanical Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });
});

