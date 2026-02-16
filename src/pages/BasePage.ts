import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage — extended by all page objects.
 */
export abstract class BasePage {
  readonly page: Page;

  // ─── Global UI elements present across all pages ──────────────────────────
  readonly globalLoader: Locator;
  readonly toastSuccess: Locator;
  readonly toastError: Locator;
  readonly toastContainer: Locator;
  readonly navBar: Locator;
  readonly userMenu: Locator;
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalConfirmBtn: Locator;
  readonly modalCancelBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Vue apps often use global spinner overlays during async operations
    this.globalLoader = page.locator('[data-testid="global-loader"], .loading-overlay, .v-overlay--active').first();
    this.toastContainer = page.locator('.toast-container, [role="status"], .notification-container').first();
    this.toastSuccess = page.locator('.toast--success, [data-type="success"], .alert-success').first();
    this.toastError = page.locator('.toast--error, [data-type="error"], .alert-error').first();
    this.navBar = page.locator('nav, [role="navigation"]').first();
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu, [aria-label="User menu"]').first();
    this.modal = page.locator('[role="dialog"]').first();
    this.modalTitle = page.locator('[role="dialog"] h1, [role="dialog"] h2, [role="dialog"] .modal__title').first();
    this.modalConfirmBtn = page.locator('[role="dialog"] button[data-action="confirm"], [role="dialog"] .btn--primary').first();
    this.modalCancelBtn = page.locator('[role="dialog"] button[data-action="cancel"], [role="dialog"] .btn--secondary').first();
  }

  // ─── Vue-aware wait utilities ─────────────────────────────────────────────

  /**
   * Wait for Vue's async rendering to settle.
   * Vue batches DOM updates via microtasks — after triggering a reactive change,
   * we wait for network + DOM to be idle before asserting.
   */
  async waitForVue(): Promise<void> {
    // Wait for any in-flight XHR/fetch to complete
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // Allow Vue's nextTick to flush pending DOM updates
    await this.page.waitForTimeout(100);
  }

  /**
   * Wait for the global loading overlay to disappear.
   * Vue SPAs typically show a full-page loader during route transitions.
   */
  async waitForPageReady(): Promise<void> {
    await this.globalLoader
      .waitFor({ state: 'hidden', timeout: 20_000 })
      .catch(() => {}); // loader may not be present
    await this.waitForVue();
  }

  /**
   * Navigate to a path, then wait for Vue router + component to render.
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  /**
   * Wait for a Vue Router navigation to complete (URL change + DOM settle).
   */
  async waitForRouteChange(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout: 15_000 });
    await this.waitForPageReady();
  }

  // ─── Toast / Notification helpers ────────────────────────────────────────

  async expectSuccessToast(message?: string): Promise<void> {
    // Vue toast libs (vue-toastification, etc.) append to body
    const successToast = this.page.locator(
      '.Vue-Toastification__toast--success, .toast--success, [role="status"][class*="success"]'
    ).first();
    await expect(successToast).toBeVisible({ timeout: 8_000 });
    if (message) await expect(successToast).toContainText(message);
  }

  async expectErrorToast(message?: string): Promise<void> {
    const errorToast = this.page.locator(
      '.Vue-Toastification__toast--error, .toast--error, [role="alert"][class*="error"]'
    ).first();
    await expect(errorToast).toBeVisible({ timeout: 8_000 });
    if (message) await expect(errorToast).toContainText(message);
  }

  // ─── Modal helpers ────────────────────────────────────────────────────────

  async expectModalOpen(title?: string): Promise<void> {
    await expect(this.modal).toBeVisible({ timeout: 8_000 });
    if (title) await expect(this.modalTitle).toContainText(title);
  }

  async confirmModal(): Promise<void> {
    await this.modalConfirmBtn.click();
    await expect(this.modal).toBeHidden({ timeout: 8_000 });
  }

  async closeModal(): Promise<void> {
    const closeBtn = this.modal.locator('button[aria-label="Close"], .modal__close, button.close').first();
    await closeBtn.click();
    await expect(this.modal).toBeHidden({ timeout: 5_000 });
  }

  // ─── Form helpers ─────────────────────────────────────────────────────────

  /**
   * Fill a form field and trigger Vue's v-model update.
   * Vue's v-model listens to 'input' events — Playwright's fill() does emit them.
   */
  async fillField(locator: Locator, value: string): Promise<void> {
    await locator.clear();
    await locator.fill(value);
    // Trigger Vue's reactive update
    await locator.dispatchEvent('input');
    await locator.dispatchEvent('change');
  }

  /**
   * Select from a Vue custom dropdown (not native <select>).
   * Vue UI frameworks often render custom dropdowns as div-based listboxes.
   */
  async selectFromCustomDropdown(triggerLocator: Locator, optionText: string): Promise<void> {
    await triggerLocator.click();
    await this.page.waitForTimeout(300); // animation
    const option = this.page.locator(`[role="option"]:has-text("${optionText}"), li:has-text("${optionText}")`).first();
    await option.click();
    await this.waitForVue();
  }

  // ─── Stripe iframe helpers ────────────────────────────────────────────────

  /**
   * Fill a Stripe iframe input field.
   * Stripe Elements render each card field in an isolated iframe.
   */
  async fillStripeField(iframeName: string, value: string): Promise<void> {
    const stripeFrame = this.page.frameLocator(`iframe[name="${iframeName}"]`);
    const input = stripeFrame.locator('input[name="cardnumber"], input[autocomplete], input').first();
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await input.fill(value);
  }

  // ─── Common assertions ────────────────────────────────────────────────────

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  async expectHeading(text: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  async expectText(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible();
  }

  /** Dismiss the cookie consent banner if it is visible. */
  async dismissCookieConsent(): Promise<void> {
    const cookieAcceptBtn = this.page.getByRole('button', { name: 'Accept' });
    if (await cookieAcceptBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cookieAcceptBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }
}
