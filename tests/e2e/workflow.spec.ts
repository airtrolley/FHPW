import { test, expect } from '../../src/fixtures';
import fs from 'fs';
import path from 'path';
import { StripeTestCards } from '../../src/helpers/StripeTestCards';

test.use({ storageState: undefined });

/**
 * TC-01 — Complete signup-to-booking workflow
 *
 * End-to-end test covering member registration, scan selection,
 * scheduling, payment with a valid Stripe card, and confirmation.
 */

test.describe('Member Signup Form', () => {

  test('@smoke TC-01: fill out signup form and navigate to plan selection', async ({
    page,
    memberAuthPage,
    dataFactory,
    planSelectionPage,
    schedulingPage,
    paymentPage,
    confirmationPage,
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

    // ── Dismiss cookie consent ────────────────────────────────────────────
    await planSelectionPage.dismissCookieConsent();

    // ── Plan selection: demographics + MRI scan ───────────────────────────
    await planSelectionPage.completePlanSelection();

    // ── Wait for schedule page ────────────────────────────────────────────
    await page.waitForURL(/schedule|booking/, { timeout: 20_000 });
    await page.waitForTimeout(1_000);

    // ── Schedule: location, date, time ────────────────────────────────────
    await schedulingPage.expectLocationsLoaded();
    await schedulingPage.selectFirstAvailableLocation();
    await schedulingPage.selectFirstAvailableDate();
    await schedulingPage.selectFirstAvailableTimeSlot();

    // Capture selected values for confirmation verification
    await page.waitForTimeout(1_000);

    let selectedLocation = '';
    try {
      const el = page.locator('[data-selected="true"], .selected, button[aria-pressed="true"]').first();
      selectedLocation = (await el.textContent({ timeout: 2_000 }).catch(() => '')) ?? '';
    } catch { /* optional */ }

    let selectedDate = '';
    try {
      const el = page.locator('.vuecal__cell--selected, [data-selected="true"]').first();
      selectedDate = (await el.getAttribute('aria-label').catch(async () =>
        await el.textContent({ timeout: 2_000 }).catch(() => '')
      )) ?? '';
    } catch { /* optional */ }

    let selectedTime = '';
    try {
      const el = page.locator('[data-testid="time-slot"][data-selected="true"], button.selected, [aria-pressed="true"]').last();
      selectedTime = (await el.textContent({ timeout: 2_000 }).catch(() => '')) ?? '';
    } catch { /* optional */ }

    // ── Continue to payment ───────────────────────────────────────────────
    await schedulingPage.clickContinue();

    // ── Payment with valid card ───────────────────────────────────────────
    await paymentPage.enterCreditCard(StripeTestCards.valid);
    await paymentPage.submitPayment();

    // ── Verify confirmation ───────────────────────────────────────────────
    await confirmationPage.waitForConfirmation();
    await confirmationPage.expectBookingDetails({
      scanType: 'MRI Scan',
      location: selectedLocation,
      date: selectedDate,
      time: selectedTime,
    });
  });

});
