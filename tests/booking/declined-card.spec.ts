import { test, expect } from '../../src/fixtures';
import { StripeTestCards } from '../../src/helpers/StripeTestCards';

test.use({ storageState: undefined });

/**
 * TC-02 — Declined card error handling
 *
 * Validates that when a Stripe declined card is used:
 * - "Your card was declined." error is shown inside the Stripe iframe
 * - User remains on the payment page (URL unchanged)
 * - Submit button re-enables so the user can retry
 * - Payment form stays intact
 */

test.describe('Payment Error Handling', () => {

  test('TC-02: declined card shows error and allows retry', async ({
    page,
    memberAuthPage,
    dataFactory,
    planSelectionPage,
    schedulingPage,
    paymentPage,
  }) => {
    const newMember = dataFactory.createMemberProfile();

    // ── Signup & arrive at plan selection ──────────────────────────────────
    await memberAuthPage.signupNewMember(newMember);

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

    // ── Continue to payment ───────────────────────────────────────────────
    await schedulingPage.clickContinue();

    // ── Capture payment page URL ──────────────────────────────────────────
    await page.waitForTimeout(2_000);
    const paymentPageUrl = page.url();

    // ── Enter declined card & submit ──────────────────────────────────────
    await paymentPage.enterCreditCard(StripeTestCards.declined);
    await paymentPage.submitPayment();

    // ── Wait for Stripe's async error response ────────────────────────────
    await page.waitForTimeout(5_000);

    // ── Verify "Your card was declined." in Stripe iframe ─────────────────
    await paymentPage.expectStripeDeclinedError();

    // ── Verify user stayed on payment page ────────────────────────────────
    await expect(page).toHaveURL(/sign-up\/reserve-appointment|payment|step-3/);
    expect(page.url()).toContain('reserve-appointment');

    // ── Verify submit button is re-enabled for retry ──────────────────────
    await paymentPage.expectSubmitEnabled();

    // ── Verify payment form is still intact ───────────────────────────────
    await paymentPage.expectPaymentFormVisible();
  });

});
