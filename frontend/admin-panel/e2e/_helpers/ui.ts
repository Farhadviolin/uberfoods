import { expect, Locator, TestInfo } from '@playwright/test';

export async function smartPress(locator: Locator, testInfo: TestInfo, timeout = 10000) {
  const isTouch = !!(testInfo.project.use as any)?.hasTouch;

  try {
    if (isTouch) {
      await locator.tap({ timeout });
    } else {
      await locator.click({ timeout });
    }
  } catch {
    // Fallback: force (nur wenn wirklich nötig)
    if (isTouch) {
      await locator.tap({ force: true });
    } else {
      await locator.click({ force: true });
    }
  }
}

export async function smartCheck(locator: Locator, testInfo: TestInfo, checked = true) {
  // Checkbox ist auf Mobile oft tricky → erst normal, dann force
  try {
    checked ? await locator.check({ timeout: 10000 }) : await locator.uncheck({ timeout: 10000 });
  } catch {
    checked ? await locator.check({ force: true }) : await locator.uncheck({ force: true });
  }
  await expect(locator).toBeChecked({ checked });
}

export async function smartFill(locator: Locator, testInfo: TestInfo, value: string) {
  const isTouch = !!(testInfo.project.use as any)?.hasTouch;

  // Tap/click to focus first (important on mobile)
  try {
    if (isTouch) {
      await locator.tap({ timeout: 3000 });
    } else {
      await locator.click({ timeout: 3000 });
    }
  } catch {
    // Ignore focus errors, continue with fill
  }

  // Clear and fill
  await locator.clear();
  await locator.fill(value);

  // Verify value was set (retry once if needed)
  try {
    await expect(locator).toHaveValue(value);
  } catch {
    // Retry: sometimes mobile needs a moment
    await locator.clear();
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }
}

export async function smartSelectByValue(locator: Locator, testInfo: TestInfo, value: string) {
  const isTouch = !!(testInfo.project.use as any)?.hasTouch;

  // Tap/click to open dropdown first
  try {
    if (isTouch) {
      await locator.tap({ timeout: 3000 });
    } else {
      await locator.click({ timeout: 3000 });
    }
  } catch {
    // Ignore focus errors, continue
  }

  // Select the option
  await locator.selectOption(value);

  // Verify value was selected
  await expect(locator).toHaveValue(value);
}
