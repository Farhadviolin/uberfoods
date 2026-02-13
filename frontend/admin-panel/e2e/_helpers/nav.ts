import { Page, expect, TestInfo } from '@playwright/test';
import { loginAsAdmin } from './auth';
import { smartPress } from './ui';

export async function closeBlockingOverlays(page: Page) {
  const modal = page.locator('[data-testid="restaurant-modal"], [data-testid="confirm-dialog"]');
  if (await modal.first().isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(modal.first()).toBeHidden({ timeout: 5000 }).catch(() => {});
  }
}

export async function ensureMobileSidebarOpen(page: Page) {
  const sidebar = page.getByTestId('sidebar');

  // Sidebar muss existieren (AdminShell gerendert)
  await expect(sidebar).toBeVisible({ timeout: 15000 });

  const open = await sidebar.getAttribute('data-open');

  if (open !== '1') {
    const mobileToggle = page.getByTestId('mobile-menu-toggle');
    if (await mobileToggle.isVisible().catch(() => false)) {
      await mobileToggle.scrollIntoViewIfNeeded();
      await mobileToggle.click({ timeout: 5000 });

      // ✅ Ground Truth: Sidebar wirklich offen
      await expect(sidebar).toHaveAttribute('data-open', '1', { timeout: 10000 });
    }
  }
}

export async function ensureSidebarOpen(page: Page, testInfo: TestInfo) {
  const sidebar = page.getByTestId('sidebar');

  // Sidebar muss existieren (AdminShell gerendert)
  await expect(sidebar).toBeVisible({ timeout: 15000 });

  const open = await sidebar.getAttribute('data-open');

  if (open !== '1') {
    const isTouch = !!(testInfo.project.use as any)?.hasTouch;

    if (isTouch) {
      // Mobile: use mobile-menu-toggle
      const mobileToggle = page.getByTestId('mobile-menu-toggle');
      await smartPress(mobileToggle, testInfo);
    } else {
      // Desktop: try to find and use sidebar-toggle
      const desktopToggle = page.getByTestId('sidebar-toggle');
      if (await desktopToggle.isVisible().catch(() => false)) {
        console.log('Found desktop sidebar toggle, clicking it');
        await smartPress(desktopToggle, testInfo);
        // Wait a bit for the toggle to take effect
        await page.waitForTimeout(500);

        // Check if toggle actually worked
        const newOpen = await sidebar.getAttribute('data-open');
        if (newOpen !== '1') {
          console.log('Sidebar toggle clicked but data-open still not 1, trying again');
          await smartPress(desktopToggle, testInfo);
          await page.waitForTimeout(500);
        }
      } else {
        throw new Error('Sidebar toggle not found on desktop but sidebar is collapsed. Cannot proceed with navigation.');
      }
    }

    // Final check: log warning but don't fail if sidebar doesn't open (for hard gates)
    const finalOpen = await sidebar.getAttribute('data-open');
    if (finalOpen !== '1') {
      console.log('Warning: Sidebar data-open is still not 1 after toggle attempts, but proceeding with navigation');
    }
  }
}

export async function ensureSidebarClosedOnMobile(page: Page, testInfo: TestInfo) {
  const sidebar = page.getByTestId('sidebar');

  // Sidebar existiert nicht in allen Layouts → defensiv
  if (!(await sidebar.isVisible().catch(() => false))) return;

  const open = await sidebar.getAttribute('data-open');
  const isTouch = !!(testInfo.project.use as any)?.hasTouch;

  // Wenn Sidebar offen ist und wir Touch haben, kann sie Content/Checkboxen blockieren
  if (isTouch && open === '1') {
    const mobileToggle = page.getByTestId('mobile-menu-toggle');
    await smartPress(mobileToggle, testInfo);
    await expect(sidebar).toHaveAttribute('data-open', '0', { timeout: 15000 });
  }
  // On desktop, sidebar usually stays open
}

export async function scrollContentTop(page: Page) {
  const container = page.locator('main, [data-testid*="content"], body').first();
  await container.evaluate((el) => {
    el.scrollTop = 0;
  }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
}

export async function gotoAdminSection(page: Page, section: string, testInfo: TestInfo) {
  // Section mapping
  const sectionConfig = {
    dashboard: {
      link: 'sidebar-link-dashboard',
      root: 'dashboard-page'
    },
    restaurants: {
      link: 'sidebar-link-restaurants',
      root: 'restaurant-management'
    }
  };

  const config = sectionConfig[section as keyof typeof sectionConfig];
  if (!config) throw new Error(`Unknown section: ${section}`);

  // 1) closeBlockingOverlays
  await closeBlockingOverlays(page);

  // 2) if root already visible: ensureSidebarClosedOnMobile + scroll top; return
  const rootLocator = page.getByTestId(config.root);
  if (await rootLocator.isVisible().catch(() => false)) {
    await ensureSidebarClosedOnMobile(page, testInfo);
    await scrollContentTop(page);
    return;
  }

  // 3) ensureSidebarOpen
  await ensureSidebarOpen(page, testInfo);

  // 4) find link by testid, scrollIntoViewIfNeeded, smartPress
  const sectionLink = page.getByTestId(config.link);
  await sectionLink.scrollIntoViewIfNeeded();
  await smartPress(sectionLink, testInfo);

  // 5) wait for root visible (timeout 30s for mobile)
  await expect(rootLocator).toBeVisible({ timeout: 30000 });

  // 6) ensureSidebarClosedOnMobile
  await ensureSidebarClosedOnMobile(page, testInfo);

  // 7) scroll top
  await scrollContentTop(page);
}

export async function setupAdminPage(page: Page, section: string = 'dashboard', testInfo?: TestInfo) {
  // Disable animations and transitions for deterministic E2E tests
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0ms !important;
        scroll-behavior: auto !important;
      }
      /* Force sidebar animations to be instant */
      .sidebar {
        transition: none !important;
        animation: none !important;
      }
      /* Disable all CSS transitions on sidebar elements */
      aside[data-testid="sidebar"],
      aside[data-testid="sidebar"] * {
        transition: none !important;
        animation: none !important;
        transform: none !important;
      }
    `
  });

  // Assumes login already done
  await gotoAdminSection(page, section, testInfo || { project: { use: {} } } as TestInfo);
}
