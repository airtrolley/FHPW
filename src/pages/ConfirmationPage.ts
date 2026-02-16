import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ConfirmationPage — booking/scan confirmation after successful payment.
 *
 * URL patterns:
 *   /sign-up/scan-confirm   (signup flow)
 *   /booking/confirmation    (existing-member booking flow)
 *   /success | /complete     (fallback patterns)
 */
export class ConfirmationPage extends BasePage {
  private static readonly URL_PATTERN =
    /\/(sign-up\/scan-confirm|booking\/confirmation|success|complete)/;

  readonly appointmentDetails: Locator;

  constructor(page: Page) {
    super(page);

    this.appointmentDetails = page.getByText(
      /MRI Scan.*Appointment.*Location.*Date/,
    );
  }

  // ─── Waits ───────────────────────────────────────────────────────────────

  /** Wait for the confirmation page URL to appear after payment. */
  async waitForConfirmation(): Promise<void> {
    await this.page.waitForURL(ConfirmationPage.URL_PATTERN, {
      timeout: 30_000,
    });
    await expect(this.page).toHaveURL(ConfirmationPage.URL_PATTERN);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────

  /** Verify appointment details block is visible. */
  async expectAppointmentDetailsVisible(): Promise<void> {
    await expect(this.appointmentDetails).toBeVisible({ timeout: 10_000 });
  }

  /** Verify a specific scan type name appears on the page. */
  async expectScanType(scanType: string): Promise<void> {
    await expect(this.page.getByText(scanType)).toBeVisible();
  }

  /** Verify selected booking details appear on the confirmation page. */
  async expectBookingDetails(details: {
    scanType?: string;
    location?: string;
    date?: string;
    time?: string;
  }): Promise<void> {
    await this.expectAppointmentDetailsVisible();

    if (details.scanType) {
      await this.expectScanType(details.scanType);
    }
    if (details.location?.trim()) {
      const pattern = new RegExp(details.location.trim().substring(0, 15), 'i');
      await expect(this.page.locator('body')).toContainText(pattern);
    }
    if (details.date?.trim()) {
      const pattern = new RegExp(details.date.trim().substring(0, 10), 'i');
      await expect(this.page.locator('body')).toContainText(pattern);
    }
    if (details.time?.trim()) {
      const pattern = new RegExp(details.time.trim(), 'i');
      await expect(this.page.locator('body')).toContainText(pattern);
    }
  }
}
