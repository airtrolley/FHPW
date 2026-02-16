import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Credentials, MemberProfile } from '../types';

/**
 * MemberAuthPage — handles login and registration on the member-facing portal.
*/

export class MemberAuthPage extends BasePage {
  // ─── Login form ───────────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly loginErrorMessage: Locator;

  // ─── Registration form ────────────────────────────────────────────────────
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  //readonly dobInput: Locator;
  readonly phoneInput: Locator;
  readonly regEmailInput: Locator;
  readonly regPasswordInput: Locator;
  readonly regConfirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly termsCheckbox: Locator;

  constructor(page: Page) {
    super(page);

    // Login
    this.emailInput = page.getByRole('textbox', { name: /email/i })
      .or(page.locator('input[type="email"]'))
      .first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.loginButton = page.getByRole('button', { name: /Submit|sign in|log in|login/i }).first();
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot/i }).first();
    this.registerLink = page.getByRole('link', { name: /Join|sign up|create account/i }).first();
    this.loginErrorMessage = page.locator(
      '[data-testid="login-error"], .error-message, .alert--error, [role="alert"]'
    ).first();

    // Registration
    this.firstNameInput = page.getByLabel(/first name|legal.*first/i).or(page.locator('input[name="firstName"]')).first();
    this.lastNameInput = page.getByLabel(/last name|legal.*last/i).or(page.locator('input[name="lastName"]')).first();
    //this.dobInput = page.getByLabel(/date of birth|dob|birthday/i).or(page.locator('input[name="dateOfBirth"]')).first();
    this.phoneInput = page.locator('input[type="tel"], input[name="phone"], .iti input').first();
    this.regEmailInput = page.locator('input[name="email"]').first();
    this.regPasswordInput = page.locator('input[name="password"]').first();
    this.regConfirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="passwordConfirmation"]').first();
    this.registerButton = page.getByRole('button', { name: /Submit|register|sign up/i }).first();
    this.termsCheckbox = page.locator('input[type="checkbox"][name*="terms"], input[type="checkbox"][name*="agree"]').first();
  }

  async gotoLogin(): Promise<void> {
    await this.goto('/sign-in');
    await expect(this.loginButton).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Skip or handle the plan selection page after registration.
   * Looks for a Skip/Continue button or closes any modal.
   */
  /**
   * Handle the timezone confirmation popup that appears after login.
   * Looks for the timezone confirmation dialog and confirms it.
   * CRITICAL: Only clicks the Confirm button specifically, never other buttons.
   */
  async handleTimezoneConfirmation(): Promise<void> {
    // Wait a moment for the popup to appear
    await this.page.waitForTimeout(1_000);

    // Look for the timezone dialog using both role="dialog" and the app's .modal-dialogue class
    const timezoneDialog = this.page.locator(
      '[role="dialog"], .modal-dialogue, [class*="modal-dialogue"]'
    ).filter({
      hasText: /timezone|time zone|preferred time/i,
    }).first();

    const isDialogVisible = await timezoneDialog.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isDialogVisible) return;

    // Click the Confirm button inside the dialog
    const confirmButton = timezoneDialog.getByRole('button', { name: /confirm/i }).first();
    if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async skipPlanSelection(): Promise<void> {
    const currentUrl = this.page.url();
    console.log('Current URL before plan selection:', currentUrl);

    // Check if we're on the select-plan page
    if (!currentUrl.includes('/select-plan')) {
      console.log('Not on select-plan page, skipping...');
      return;
    }

    console.log('Handling plan selection page...');

    // Try multiple button selectors
    const allButtons = this.page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons on the page`);

    for (let i = 0; i < buttonCount && i < 10; i++) {
      const buttonText = await allButtons.nth(i).textContent();
      console.log(`  Button ${i}: "${buttonText}"`);
    }

    // Try to find and click a Skip button
    const skipButton = this.page.getByRole('button', { name: /skip|continue|next|close|select|accept/i }).first();

    if (await skipButton.isVisible().catch(() => false)) {
      console.log('Found skip/continue button, clicking it...');
      await skipButton.click();
      await this.waitForPageReady();
      console.log('Skipped/accepted plan selection');
    } else {
      console.log('No skip button found, trying to navigate away...');
      // If no skip button, navigate away
      await this.goto('/sign-in');
    }
  }

  async gotoRegister(): Promise<void> {
    await this.goto('/register');
    await this.waitForPageReady();
  }

  /**
   * Navigate to login → register link → fill & submit registration form
   * → verify no duplicate-account error → wait for plan-selection page.
   *
   * Returns after the browser is on /select-plan.
   */
  async signupNewMember(profile: MemberProfile & { password: string }): Promise<void> {
    await this.gotoLogin();
    await expect(this.registerLink).toBeVisible({ timeout: 10_000 });
    await this.registerLink.click();
    await this.waitForPageReady();
    await expect(this.registerButton).toBeVisible({ timeout: 10_000 });
    await this.register(profile);

    // Verify no "account already exists" error
    const accountExistsError = this.page.locator('div.toast, [role="alert"]').filter({
      hasText: /previously created an account/i,
    });
    await expect(accountExistsError).not.toBeVisible({ timeout: 3_000 });

    // Wait for navigation to plan selection page
    await this.page.waitForURL(
      (url) => url.toString().includes('/select-plan'),
      { timeout: 20_000 },
    );
    await expect(this.page).toHaveURL(/select-plan/);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  async login(credentials: Credentials): Promise<void> {
    await this.fillField(this.emailInput, credentials.email);
    await this.fillField(this.passwordInput, credentials.password);
    await this.loginButton.click();
  }

  async loginAndWaitForDashboard(credentials: Credentials): Promise<void> {
    await this.login(credentials);
    await this.handleTimezoneConfirmation();
    await this.waitForRouteChange(/\/(dashboard|home|booking|onboarding)/);
  }

  async register(profile: MemberProfile & { password: string }): Promise<void> {
    // Step 1: Fill text fields
    await this.fillField(this.firstNameInput, profile.firstName);
    await this.fillField(this.lastNameInput, profile.lastName);

    // Step 2: Fill phone if visible
    if (await this.phoneInput.isVisible().catch(() => false)) {
      try {
        await this.fillField(this.phoneInput, profile.phone || '');
      } catch {
        // Phone field might be optional
      }
    }

    // Step 3: Fill email and password
    await this.fillField(this.regEmailInput, profile.email);
    await this.fillField(this.regPasswordInput, profile.password);

    // Step 4: Fill confirm password if visible
    if (await this.regConfirmPasswordInput.isVisible().catch(() => false)) {
      try {
        await this.fillField(this.regConfirmPasswordInput, profile.password);
      } catch {
        // Confirm password might be optional
      }
    }

    // Step 5: Wait for form to settle after filling
    await this.waitForVue();
    await this.page.waitForTimeout(300);

    // Step 6: Check ALL required checkboxes - try multiple approaches
    await this.page.getByRole('button', { name: /terms of use/i }).first().click({ force: true });
    await this.page.waitForTimeout(100);
    
    // Step 7: Verify all checkboxes are checked
    await this.verifyAllCheckboxesChecked();

    // Step 8: Wait for form validation
    await this.waitForVue();
    await this.page.waitForTimeout(500);

    // Step 9: Ensure submit button is enabled
    await expect(this.registerButton).toBeEnabled({ timeout: 10_000 });

    // Step 10: Submit form
    await this.registerButton.click();
    await this.waitForPageReady();
  }

  /**
   * Verify that all required checkboxes are checked.
   * If any are unchecked, attempts multiple times to check them.
   */
  private async verifyAllCheckboxesChecked(): Promise<void> {
    const checkboxButtons = this.page.locator('button[role="checkbox"]');
    const count = await checkboxButtons.count();

    for (let i = 0; i < count; i++) {
      const button = checkboxButtons.nth(i);
      const buttonText = await button.textContent();

      // Check if the button has visual indicators of being checked
      let isChecked = await button.evaluate((el) => {
        const img = el.querySelector('img');
        const hasCheckmark = img && (img.src.includes('check') || img.className.includes('check'));
        const classList = el.className;
        const ariaChecked = el.getAttribute('aria-checked');

        return (
          hasCheckmark ||
          classList.includes('checked') ||
          classList.includes('active') ||
          ariaChecked === 'true'
        );
      });

      console.log(
        `Checkbox ${i + 1} (${buttonText?.substring(0, 40)}...) - Checked: ${isChecked}`
      );

      // If unchecked, retry multiple times
      if (!isChecked) {
        console.warn(`❌ Checkbox ${i + 1} is NOT checked. Attempting to check...`);
        let retryCount = 0;
        const maxRetries = 5;

        while (!isChecked && retryCount < maxRetries) {
          retryCount++;
          console.log(`   Retry ${retryCount}/${maxRetries}...`);

          // Try different click approaches
          if (retryCount === 1) {
            // Standard click
            await button.click({ force: true });
          } else if (retryCount === 2) {
            // Double click
            await button.dblclick({ force: true });
          } else if (retryCount === 3) {
            // Evaluate and trigger click inside the button
            await button.evaluate((el) => {
              const input = el.querySelector('input[type="checkbox"]');
              if (input) {
                input.click();
              }
              el.click();
            });
          } else if (retryCount === 4) {
            // Tab to element and press Space
            await button.focus();
            await this.page.keyboard.press('Space');
          } else {
            // Force click with no wait
            await button.click({ force: true, noWaitAfter: true });
          }

          await this.page.waitForTimeout(300);

          // Re-check the state
          isChecked = await button.evaluate((el) => {
            const img = el.querySelector('img');
            const hasCheckmark = img && (img.src.includes('check') || img.className.includes('check'));
            const classList = el.className;
            const ariaChecked = el.getAttribute('aria-checked');

            return (
              hasCheckmark ||
              classList.includes('checked') ||
              classList.includes('active') ||
              ariaChecked === 'true'
            );
          });

          if (isChecked) {
            console.log(`   ✅ Checkbox ${i + 1} is now checked!`);
          }
        }

        if (!isChecked) {
          console.error(`❌ FAILED: Checkbox ${i + 1} still not checked after ${maxRetries} retries`);
        }
      }
    }
  }

  /**
   * Verify Terms and Conditions checkbox is checked.
   * If not checked, will attempt to check it.
   */
  async expectTermsCheckboxChecked(): Promise<void> {
    const termsButton = this.page
      .locator('button[role="checkbox"]')
      .filter({ hasText: /terms of use|Ezra's/i })
      .first();

    // Verify the button exists
    try {
      await expect(termsButton).toBeVisible({ timeout: 5_000 });
    } catch (e) {
      console.error('❌ Terms checkbox button not found. Trying alternative selectors...');
      // Log all checkbox buttons to help debug
      const allCheckboxes = await this.page.locator('button[role="checkbox"]').count();
      console.log(`Found ${allCheckboxes} checkbox buttons total`);
      for (let i = 0; i < allCheckboxes; i++) {
        const text = await this.page.locator('button[role="checkbox"]').nth(i).textContent();
        console.log(`  Checkbox ${i}: "${text}"`);
      }
      throw e;
    }

    let isChecked = await termsButton.evaluate((el) => {
      const img = el.querySelector('img');
      const hasCheckmark = img && (img.src.includes('check') || img.className.includes('check'));
      const classList = el.className;
      const ariaChecked = el.getAttribute('aria-checked');
      return hasCheckmark || classList.includes('checked') || ariaChecked === 'true';
    });

    // Get detailed state for logging
    const detailedState = await termsButton.evaluate((el) => ({
      className: el.className,
      ariaChecked: el.getAttribute('aria-checked'),
      innerHTML: el.innerHTML.substring(0, 200),
    }));

    console.log(`Terms checkbox state:`, detailedState);
    console.log(`Terms and Conditions checkbox - Checked: ${isChecked}`);

    // If not checked, attempt to check it
    if (!isChecked) {
      console.warn('⚠️ Terms and Conditions checkbox is NOT checked. Attempting to check...');

      let retryCount = 0;
      const maxRetries = 5;

      while (!isChecked && retryCount < maxRetries) {
        retryCount++;
        console.log(`   Retry ${retryCount}/${maxRetries}...`);

        // Try different approaches
        if (retryCount === 1) {
          await termsButton.click({ force: true });
        } else if (retryCount === 2) {
          await termsButton.dblclick({ force: true });
        } else if (retryCount === 3) {
          await termsButton.evaluate((el) => {
            const input = el.querySelector('input[type="checkbox"]');
            if (input) {
              input.checked = true;
              input.click();
            }
            el.click();
          });
        } else if (retryCount === 4) {
          await termsButton.focus();
          await this.page.keyboard.press('Space');
        } else {
          await termsButton.click({ force: true, noWaitAfter: true });
        }

        await this.page.waitForTimeout(300);

        // Re-check the state
        isChecked = await termsButton.evaluate((el) => {
          const img = el.querySelector('img');
          const hasCheckmark = img && (img.src.includes('check') || img.className.includes('check'));
          const classList = el.className;
          const ariaChecked = el.getAttribute('aria-checked');
          return hasCheckmark || classList.includes('checked') || ariaChecked === 'true';
        });

        // Log state after retry
        const stateAfter = await termsButton.evaluate((el) => ({
          className: el.className,
          ariaChecked: el.getAttribute('aria-checked'),
        }));
        console.log(`   After retry ${retryCount}:`, stateAfter, `Checked: ${isChecked}`);

        if (isChecked) {
          console.log(`   ✅ Terms and Conditions checkbox is now checked!`);
        }
      }

      if (!isChecked) {
        // Take a screenshot for debugging
        await this.page.screenshot({ path: 'checkbox-failed.png' });
        throw new Error(
          `❌ FAILED: Terms and Conditions checkbox could not be checked after ${maxRetries} retry attempts`
        );
      }
    } else {
      console.log('✅ Terms and Conditions checkbox is checked');
    }
  }

  // ─── Assertions ──────────────────────────────────────────────────────────

  async expectLoginError(message?: string): Promise<void> {
    await expect(this.loginErrorMessage).toBeVisible({ timeout: 8_000 });
    if (message) await expect(this.loginErrorMessage).toContainText(message);
  }

  async expectLoggedIn(): Promise<void> {
    // After login, Vue router redirects away from /sign-in or /login
    await expect(this.page).not.toHaveURL(/\/(sign-in|login)/);
  }

  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(sign-in|login)/, { timeout: 10_000 });
  }
}
