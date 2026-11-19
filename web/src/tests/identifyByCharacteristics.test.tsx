import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { IdentifyByCharacteristics } from '@/pages/IdentifyByCharacteristics';

describe('IdentifyByCharacteristics Page Flow', () => {
  it('starts completely blank with zero answered traits and disabled submit button', () => {
    render(
      <BrowserRouter>
        <IdentifyByCharacteristics />
      </BrowserRouter>
    );

    // Initial progress
    expect(screen.getByText('0 of 16 traits answered')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();

    // Check sliders start unset
    const notSetLabels = screen.getAllByText('Not set');
    expect(notSetLabels.length).toBeGreaterThanOrEqual(3); // Height, Length, Width, Petals

    // Submit button should be disabled
    const submitBtn = screen.getByRole('button', { name: /Submit \/ Identify/i });
    expect(submitBtn).toBeDisabled();

    // Helper notice
    expect(screen.getByText(/Answer at least 4 traits to identify species/i)).toBeInTheDocument();

    // Idle state card in results area
    expect(screen.getByText('Awaiting Specimen Traits')).toBeInTheDocument();
  });

  it('enables submit button after answering at least 4 traits and allows clearing', () => {
    render(
      <BrowserRouter>
        <IdentifyByCharacteristics />
      </BrowserRouter>
    );

    const habitSelect = screen.getByDisplayValue(/-- Select habit/i);
    fireEvent.change(habitSelect, { target: { value: 'tree' } });

    const leafTypeSelect = screen.getByDisplayValue(/-- Select leaf type/i);
    fireEvent.change(leafTypeSelect, { target: { value: 'simple' } });

    const shapeSelect = screen.getByDisplayValue(/-- Select leaf shape/i);
    fireEvent.change(shapeSelect, { target: { value: 'ovate' } });

    const sapSelect = screen.getByDisplayValue(/-- Select sap/i);
    fireEvent.change(sapSelect, { target: { value: 'milky_white' } });

    // Progress updated to 4 of 16
    expect(screen.getByText('4 of 16 traits answered')).toBeInTheDocument();
    expect(screen.getAllByText(/Ready to classify/i).length).toBeGreaterThanOrEqual(1);

    const submitBtns = screen.getAllByRole('button', { name: /Submit \/ Identify|Identify/i });
    expect(submitBtns[0]).not.toBeDisabled();

    // Test Clear All
    const clearBtns = screen.getAllByRole('button', { name: /Clear all/i });
    fireEvent.click(clearBtns[0]!);

    expect(screen.getByText('0 of 16 traits answered')).toBeInTheDocument();
    expect(submitBtns[0]).toBeDisabled();
  });

  it('contains "Not sure / skip" options across categorical attributes', () => {
    render(
      <BrowserRouter>
        <IdentifyByCharacteristics />
      </BrowserRouter>
    );

    const skipOptions = screen.getAllByText('Not sure / skip');
    // All 12 categorical traits have this option
    expect(skipOptions.length).toBe(12);
  });
});
