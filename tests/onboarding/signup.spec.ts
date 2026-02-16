import { test, expect } from '../../src/fixtures';
import fs from 'fs';
import path from 'path';

test.use({ storageState: undefined });

/**
 * TC-02 (Onboarding) — New member signup
 *
 * Validates the complete member registration flow:
 * - Navigate to signup, fill the form, submit
 * - Arrive at plan selection page
 * - Re-login with new credentials and verify successful authentication
 */

test.describe('Member Signup Form', () => {

  test('@Critical member signup test: fill out signup form and navigate to plan selection', async ({
    page,
    memberAuthPage,
    dataFactory,
    planSelectionPage,
  }) => {
    const newMember = dataFactory.createMemberProfile();

    // ── Signup & arrive at plan selection ──────────────────────────────────
    await memberAuthPage.signupNewMember(newMember);
    await planSelectionPage.expectPageLoaded();

    // ── Save credentials for debugging ────────────────────────────────────
    const credentialsPath = path.resolve('test-results-debug', 'signup-credentials.json');
    fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });
    const existing = fs.existsSync(credentialsPath)
      ? JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
      : [];
    existing.push({
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      email: newMember.email,
      password: newMember.password,
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(credentialsPath, JSON.stringify(existing, null, 2));

    // ── Re-login with new credentials ─────────────────────────────────────
    await page.context().clearCookies();
    await memberAuthPage.gotoLogin();
    await memberAuthPage.dismissCookieConsent();
    await memberAuthPage.login({
      email: newMember.email,
      password: newMember.password,
    });

    // ── Wait for redirect away from sign-in ───────────────────────────────
    await page.waitForURL(
      (url) => !url.toString().includes('/sign-in'),
      { timeout: 20_000 },
    );

    // ── Dismiss timezone dialog if it appears ─────────────────────────────
    await memberAuthPage.handleTimezoneConfirmation();

    // ── Verify successful login ───────────────────────────────────────────
    await memberAuthPage.expectLoggedIn();
  });

});
