import { useEffect } from 'react';

/**
 * Updates document.title per page with the "PlantAI" brand convention.
 * Example: "Explore | PlantAI"
 */
export function useDocumentTitle(pageTitle?: string): void {
  useEffect(() => {
    const prevTitle = document.title;
    if (pageTitle && pageTitle.trim().length > 0) {
      document.title = `${pageTitle.trim()} | PlantAI`;
    } else {
      document.title = 'Plant Species Classification System | PlantAI';
    }

    return () => {
      document.title = prevTitle;
    };
  }, [pageTitle]);
}
