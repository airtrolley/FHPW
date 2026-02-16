import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { PaymentMethod } from '../types';

/**
 * PaymentPage — Stripe Payment
 * Handles the payment step of the booking funnel where users enter
 * credit card details via the Stripe Payment Element and submit payment.
 *
 * URL pattern: /sign-up/reserve-appointment
 */
export class PaymentPage extends BasePage {
  // ─── Order summary ────────────────────────────────────────────────────────
  readonly orderSummarySection: Locator;
  readonly orderScanName: Locator;
  readonly orderLocation: Locator;
  readonly orderDate: Locator;
  readonly orderPrice: Locator;
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;
  readonly promoSuccessMessage: Locator;
  readonly promoErrorMessage: Locator;

  // ─── Payment form ─────────────────────────────────────────────────────────
  readonly paymentSection: Locator;
  readonly stripeElementWrapper: Locator;
  readonly cardNameInput: Locator;
  readonly billingZipInput: Locator;
  readonly submitPaymentButton: Locator;

  // ─── Navigation ──────────────────────────────────────────────────────────
  readonly backButton: Locator;

  // ─── Post-payment ─────────────────────────────────────────────────────────
  readonly paymentProcessingIndicator: Locator;
  readonly paymentErrorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Order summary
    this.orderSummarySection = page.locator('[data-testid="order-summary"], .order-summary, .booking-summary').first();
    this.orderScanName = page.locator('[data-testid="order-scan-name"], .order-summary__scan, .summary__title').first();
    this.orderLocation = page.locator('[data-testid="order-location"], .order-summary__location').first();
    this.orderDate = page.locator('[data-testid="order-date"], .order-summary__date').first();
    this.orderPrice = page.locator('[data-testid="order-price"], .order-summary__price, .total-price').first();

    // Promo code
    this.promoCodeInput = page.locator('input[placeholder*="promo"], input[placeholder*="coupon"], input[name*="promo"]').first();
    this.applyPromoButton = page.getByRole('button', { name: /apply|redeem/i }).first();
    this.promoSuccessMessage = page.locator('[data-testid="promo-success"], .promo--success, .discount-applied').first();
    this.promoErrorMessage = page.locator('[data-testid="promo-error"], .promo--error').first();

    // Payment
    this.paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element').first();
    this.stripeElementWrapper = page.locator('[data-testid="stripe-element"], .stripe-element, #card-element, #payment-element').first();
    this.cardNameInput = page.getByLabel(/name on card|cardholder/i).or(page.locator('input[name="cardName"]')).first();
    this.billingZipInput = page.getByLabel(/zip|postal code/i).or(page.locator('input[name="billingZip"]')).first();

    this.submitPaymentButton = page.getByRole('button', { name: /pay|confirm|complete booking|submit/i }).last();
    this.backButton = page.getByRole('button', { name: /back|previous/i }).first();

    this.paymentProcessingIndicator = page.locator('[data-testid="payment-processing"], .payment-processing, .spinner').first();
    this.paymentErrorMessage = page.locator('[data-testid="payment-error"], .payment-error, .stripe-error, [class*="payment-error"]').first();
  }

  // ─── Stripe iframe interaction ────────────────────────────────────────────

  /**
   * Locate the Stripe Payment Element iframe.
   * Stripe renders a single iframe with name "__privateStripeFrame{N}" where N
   * is a dynamic number that changes on every page load.  We match the prefix.
   */
  private getStripeFrame() {
    return this.page
      .frameLocator('iframe[name*="__privateStripeFrame"]')
      .first();
  }

  /**
   * Enter a complete credit card using Stripe test data.
   *
   * The staging app uses Stripe's **Payment Element** which puts all card
   * fields (card number, expiry, CVC, ZIP) inside a SINGLE iframe — NOT
   * separate iframes per field like classic Stripe Elements.
   *
   * Inside the iframe the "Card" tab must be selected first, then fields
   * are filled via their accessible roles.
   */
  async enterCreditCard(payment: PaymentMethod): Promise<void> {
    // Wait for the wrapper div to appear in the host page
    await this.stripeElementWrapper.waitFor({ state: 'visible', timeout: 20_000 });

    // Wait for Stripe's JS to inject the iframe inside the wrapper
    const stripeIframe = this.page.locator('iframe[name*="__privateStripeFrame"]').first();
    await stripeIframe.waitFor({ state: 'attached', timeout: 15_000 });
    // Give Stripe a moment to fully initialise the iframe contents
    await this.page.waitForTimeout(3000);

    const frame = this.getStripeFrame();

    // Select the "Card" payment method tab if present
    const cardTab = frame.getByRole('button', { name: 'Card' });
    if (await cardTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cardTab.click();
      await this.page.waitForTimeout(500);
    }

    // Fill card number
    const cardNumberInput = frame.getByRole('textbox', { name: /card number/i });
    await cardNumberInput.waitFor({ state: 'visible', timeout: 10_000 });
    await cardNumberInput.click();
    await cardNumberInput.fill(this.formatCardWithSpaces(payment.cardNumber));

    // Fill expiry (MM / YY)
    const expiryInput = frame.getByRole('textbox', { name: /expiration date/i });
    await expiryInput.waitFor({ state: 'visible', timeout: 5_000 });
    const expiryValue = `${payment.expMonth} / ${payment.expYear.slice(-2)}`;
    await expiryInput.fill(expiryValue);

    // Fill CVC / security code
    const cvcInput = frame.getByRole('textbox', { name: /security code|cvc/i });
    await cvcInput.waitFor({ state: 'visible', timeout: 5_000 });
    await cvcInput.fill(payment.cvc);

    // Fill ZIP if the field exists inside the iframe
    if (payment.zip) {
      const zipInput = frame.getByRole('textbox', { name: /zip/i });
      if (await zipInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await zipInput.fill(payment.zip);
      }
    }
  }

  /**
   * Format a raw card number string with spaces every 4 digits,
   * matching how Stripe expects input (e.g. "4242 4242 4242 4242").
   */
  private formatCardWithSpaces(cardNumber: string): string {
    return cardNumber.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  async submitPayment(): Promise<void> {
    // Try the host-page submit button (data-test="submit" used by the app)
    const dataTestSubmit = this.page.locator('[data-test="submit"]');
    if (await dataTestSubmit.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(dataTestSubmit).toBeEnabled({ timeout: 5_000 });
      await dataTestSubmit.click();
    } else {
      await expect(this.submitPaymentButton).toBeEnabled({ timeout: 5_000 });
      await this.submitPaymentButton.click();
    }

    // Wait for payment processing to complete (spinner hidden or page navigates)
    await this.paymentProcessingIndicator
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {
        // Processing indicator may never appear if payment is fast or
        // the page navigates immediately — this is acceptable.
      });
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.waitForPageReady();
  }

  // ─── Assertions ──────────────────────────────────────────────────────────

  async expectOrderSummaryVisible(): Promise<void> {
    await expect(this.orderSummarySection).toBeVisible({ timeout: 10_000 });
  }

  async expectPaymentFormVisible(): Promise<void> {
    await expect(this.paymentSection).toBeVisible({ timeout: 10_000 });
    await expect(this.stripeElementWrapper).toBeVisible({ timeout: 15_000 });
  }

  async expectPaymentError(message?: string): Promise<void> {
    await expect(this.paymentErrorMessage).toBeVisible({ timeout: 15_000 });
    if (message) await expect(this.paymentErrorMessage).toContainText(message);
  }

  /**
   * Assert that a declined-card error is visible inside the Stripe iframe.
   * Stripe renders the "Your card was declined." message inside its own iframe,
   * not in the host page DOM.
   */
  async expectStripeDeclinedError(): Promise<void> {
    const stripeFrame = this.page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
    const declinedError = stripeFrame.getByText('Your card was declined.');
    await expect(declinedError).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Assert the submit/continue button is enabled (ready for retry after error).
   */
  async expectSubmitEnabled(): Promise<void> {
    const submitBtn = this.page.locator('[data-test="submit"]').or(this.submitPaymentButton);
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitPaymentButton).toBeDisabled();
  }

  async expectTotalPrice(price?: string): Promise<void> {
    await expect(this.orderPrice).toBeVisible();
    if (price) await expect(this.orderPrice).toContainText(price);
  }

  async expectPromoApplied(): Promise<void> {
    await expect(this.promoSuccessMessage).toBeVisible({ timeout: 5_000 });
    // Price should now show discount
    const discountLine = this.page.locator('[data-testid="discount-line"], .discount, .promo-discount').first();
    await expect(discountLine).toBeVisible();
  }
}
