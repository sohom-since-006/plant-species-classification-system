import { useEffect } from 'react';
import { SPECIES_COUNT_LABEL } from '@/config/constants';

/**
 * Updates document.title per page with the "PlantAI" brand convention.
 * Example: "Explore (150 species) | PlantAI"
 */
export function useDocumentTitle(pageTitle?: string): void {
  useEffect(() => {
    const prevTitle = document.title;
    if (pageTitle && pageTitle.trim().length > 0) {
      document.title = `${pageTitle.trim()} | PlantAI`;
    } else {
      document.title = `Plant Species Classification System (${SPECIES_COUNT_LABEL}) | PlantAI`;
    }

    return () => {
      document.title = prevTitle;
    };
  }, [pageTitle]);
}

