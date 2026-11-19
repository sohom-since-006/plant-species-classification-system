import { test, expect } from '@playwright/test';

test.describe('Navigation Regression After Classification', () => {
  test('navigates classify -> traits -> explore -> history -> dashboard -> help (footer) with visible content', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // 1. Open Classify page
    await page.goto('/classify', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Identify Specimen/i);

    // 2. Run Tulsi sample specimen through the pipeline
    const tulsiSample = page.locator('button:has-text("Tulsi")').first();
    await expect(tulsiSample).toBeVisible();
    await tulsiSample.click();

    // 3. Wait for classification to finish (Save to History button rendered)
    const saveButton = page.locator('button:has-text("Save to History")').first();
    await expect(saveButton).toBeVisible({ timeout: 45000 });

    // 4. Navigate to Traits via navbar link
    const traitsLink = page.locator('nav a[href="/identify-traits"]').first();
    await traitsLink.click();
    const traitsHeading = page.getByRole('heading', { level: 1 });
    await expect(traitsHeading).toBeVisible({ timeout: 10000 });
    await expect(traitsHeading).toContainText('Identify');
    await expect(page.locator('main > div')).toHaveCSS('opacity', '1', { timeout: 10000 });

    // 5. Navigate to Explore via navbar link
    const exploreLink = page.locator('nav a[href="/explore"]').first();
    await exploreLink.click();
    const exploreHeading = page.getByRole('heading', { level: 1 });
    await expect(exploreHeading).toBeVisible({ timeout: 10000 });
    await expect(exploreHeading).toContainText('Explore');
    await expect(page.locator('main > div')).toHaveCSS('opacity', '1', { timeout: 10000 });

    // 6. Navigate to History via navbar link
    const historyLink = page.locator('nav a[href="/history"]').first();
    await historyLink.click();
    const historyHeading = page.getByRole('heading', { level: 1 });
    await expect(historyHeading).toBeVisible({ timeout: 10000 });
    await expect(historyHeading).toContainText('Identification');
    await expect(page.locator('main > div')).toHaveCSS('opacity', '1', { timeout: 10000 });

    // 7. Navigate to Dashboard via navbar link
    const dashboardLink = page.locator('nav a[href="/dashboard"]').first();
    await dashboardLink.click();
    const dashboardHeading = page.getByRole('heading', { level: 1 });
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });
    await expect(dashboardHeading).toContainText('Dashboard');
    await expect(page.locator('main > div')).toHaveCSS('opacity', '1', { timeout: 10000 });

    // 8. Confirm Help is reachable via footer
    const footerHelpLink = page.locator('footer a[href="/help"]').first();
    await footerHelpLink.click();
    const helpHeading = page.getByRole('heading', { level: 1 });
    await expect(helpHeading).toBeVisible({ timeout: 10000 });
    await expect(helpHeading).toContainText('Field Guide');
    await expect(page.locator('main > div')).toHaveCSS('opacity', '1', { timeout: 10000 });
  });
});
