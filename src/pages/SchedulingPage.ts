import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * SchedulingPage — Location & Date/Time Selection
 * Handles the scheduling step of the booking funnel where users pick
 * a scan location, calendar date, and available time slot.
 *
 * URL pattern: /sign-up/schedule-scan
 */
export class SchedulingPage extends BasePage {
  // ─── Location selection ───────────────────────────────────────────────────
  readonly locationCards: Locator;
  readonly locationSearchInput: Locator;
  readonly locationList: Locator;

  // ─── Calendar / Date picker ───────────────────────────────────────────────
  readonly calendar: Locator;
  readonly calendarNextBtn: Locator;
  readonly calendarPrevBtn: Locator;
  readonly availableDays: Locator;
  readonly unavailableDays: Locator;
  readonly selectedDay: Locator;

  // ─── Time slot selection ──────────────────────────────────────────────────
  readonly timeSlots: Locator;
  readonly availableSlots: Locator;
  readonly selectedSlot: Locator;

  // ─── Modal / dialogs ──────────────────────────────────────────────────
  readonly scanNotAvailableModal: Locator;
  readonly scanModalContinueBtn: Locator;
  readonly scanModalCancelBtn: Locator;

  // ─── Navigation ──────────────────────────────────────────────────────────
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly selectedScanSummary: Locator;
  pageStepper: any;

  constructor(page: Page) {
    super(page);

    // Location
    this.locationCards = page.locator(
      '[data-testid="location-card"], .location-card, .location-option, [role="radio"][name*="location"]'
    );
    this.locationSearchInput = page.locator('input[placeholder*="location"], input[placeholder*="city"], input[placeholder*="zip"]').first();
    this.locationList = page.locator('[data-testid="location-list"], .locations-list, ul.locations').first();

    // Calendar
    this.calendar = page.locator('[data-testid="calendar"], .calendar, .date-picker, .vc-container, .vuecal').first();
    this.calendarNextBtn = page.locator('[aria-label="Next month"], button.calendar__next, .vc-arrow.is-right, button:has(svg):right-of(:text-is("2026"))').first();
    this.calendarPrevBtn = page.locator('[aria-label="Previous month"], button.calendar__prev, .vc-arrow.is-left, button:has(svg):left-of(:text-is("2026"))').first();
    // Available days: vue-cal cells that are not disabled
    this.availableDays = page.locator('.vuecal__cell:not(.vuecal__cell--disabled):not(.vuecal__cell--out-of-scope):not(.vuecal__cell--before-min) .vc-day-content');
    this.unavailableDays = page.locator('.vuecal__cell--disabled, .vc-day.is-disabled, [data-available="false"]');
    this.selectedDay = page.locator('.vuecal__cell--selected, .vc-day.is-selected, [aria-selected="true"]').first();

    // Time slots
    this.timeSlots = page.locator('[data-testid="time-slot"], .time-slot, .slot-button, [role="button"][data-time]');
    this.availableSlots = page.locator('[data-testid="time-slot"]:not(:disabled), .time-slot--available, .slot-button:not(.disabled)');
    this.selectedSlot = page.locator('[data-testid="time-slot"].selected, .time-slot--selected, .slot-button.active').first();

    // Navigation
    this.continueButton = page.getByRole('button', { name: /continue|next|proceed/i }).last();
    this.backButton = page.getByRole('button', { name: /back|previous/i }).first();
    this.selectedScanSummary = page.locator('[data-testid="selected-scan"], .booking-summary__scan, .order-summary').first();

    // "Scan not available at this facility" modal
    this.scanNotAvailableModal = page.locator('.modal-dialogue, [class*="modal-dialogue"]').first();
    this.scanModalContinueBtn = this.scanNotAvailableModal.getByRole('button', { name: 'Continue' });
    this.scanModalCancelBtn = this.scanNotAvailableModal.getByRole('button', { name: 'Cancel' });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * Dismiss the "MRI Scan is not available at this facility" modal.
   * This appears when the selected location offers a different scan package
   * (e.g. "MRI Scan with Spine" instead of "MRI Scan"). Clicking Continue
   * accepts the alternative package so the booking can proceed.
   */
  async dismissScanNotAvailableModal(): Promise<void> {
    const modal = this.scanNotAvailableModal;
    if (await modal.isVisible({ timeout: 3_000 }).catch(() => false)) {
      console.log('Scan-not-available modal detected — clicking Continue to accept alternative');
      await this.scanModalContinueBtn.click();
      await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await this.waitForVue();
    }
  }

  async selectFirstAvailableLocation(): Promise<void> {
    // Wait for page to be ready after navigation
    await this.page.waitForTimeout(2_000);

    // Strategy 1: Click the "Recommended" location card (most reliable)
    const recommended = this.page.getByText('Recommended', { exact: true }).first();
    if (await recommended.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await recommended.locator('..').click();
      await this.waitForVue();
      await this.dismissScanNotAvailableModal();
      return;
    }

    // Strategy 2: Location card = div with direct <p> children + "View on map" link
    const locationCard = this.page.locator('div:has(> p):has(a:text("View on map"))').first();
    if (await locationCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await locationCard.click();
      await this.waitForVue();
      await this.dismissScanNotAvailableModal();
      return;
    }

    // Strategy 3: Original selector fallbacks
    const locationSelectors = [
      this.locationCards.first(),
      this.page.locator('[class*="location"]').first(),
    ];
    for (const selector of locationSelectors) {
      if (await selector.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await selector.click();
        await this.waitForVue();
        await this.dismissScanNotAvailableModal();
        return;
      }
    }

    throw new Error('No location cards found on page');
  }

  async selectLocationByName(name: string): Promise<void> {
    const card = this.locationCards.filter({ hasText: new RegExp(name, 'i') }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await this.waitForVue();
  }

  async selectFirstAvailableDate(): Promise<void> {
    // Dismiss modal if it appeared after location selection
    await this.dismissScanNotAvailableModal();

    await this.calendar.waitFor({ state: 'visible', timeout: 15_000 });

    // Poll for available day cells — calendar renders them asynchronously
    const maxWaitMs = 20_000;
    const pollMs = 2_000;
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
      await this.page.waitForTimeout(pollMs);
      elapsed += pollMs;
      const count = await this.availableDays.count();
      if (count > 0) {
        await this.availableDays.first().click();
        await this.waitForVue();
        await this.page.waitForTimeout(4_000);
        return;
      }
    }

    // Last resort: try clicking the next-month button and checking again
    if (await this.calendarNextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.calendarNextBtn.click();
      await this.page.waitForTimeout(3_000);
      const count = await this.availableDays.count();
      if (count > 0) {
        await this.availableDays.first().click();
        await this.waitForVue();
        await this.page.waitForTimeout(4_000);
        return;
      }
    }

    throw new Error('No available dates found in calendar');
  }

  async selectFirstAvailableTimeSlot(): Promise<void> {
    // Try multiple selector strategies for time slots
    const timeSlotSelectors = [
      '[data-testid="time-slot"]:not(:disabled)',
      '.time-slot--available',
      '.slot-button:not(.disabled)',
      '[role="button"][data-time]',
      'button:has-text("AM"):not(:disabled)',
      'button:has-text("PM"):not(:disabled)',
      'label:has-text("AM")',
      'label:has-text("PM")',
    ];

    for (const selector of timeSlotSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await element.click();
        await this.waitForVue();
        return;
      }
    }

    throw new Error('No available time slots found');
  }

  async completeLocationAndSchedule(): Promise<void> {
    await this.selectFirstAvailableLocation();
    await this.selectFirstAvailableDate();
    await this.selectFirstAvailableTimeSlot();
  }

  async clickContinue(): Promise<void> {
    await expect(this.continueButton).toBeEnabled({ timeout: 5_000 });
    await this.continueButton.click();
    await this.waitForPageReady();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.waitForPageReady();
  }

  // ─── Assertions ──────────────────────────────────────────────────────────

  async expectLocationsLoaded(): Promise<void> {
    await expect(this.locationCards.first()).toBeVisible({ timeout: 15_000 });
    const count = await this.locationCards.count();
    expect(count).toBeGreaterThan(0);
  }

  async expectCalendarVisible(): Promise<void> {
    await expect(this.calendar).toBeVisible({ timeout: 10_000 });
  }

  async expectTimeSlotsVisible(): Promise<void> {
    await expect(this.timeSlots.first()).toBeVisible({ timeout: 10_000 });
  }

  async expectUnavailableDaysNotClickable(): Promise<void> {
    const firstUnavailable = this.unavailableDays.first();
    if (await firstUnavailable.isVisible()) {
      await expect(firstUnavailable).toBeDisabled()
        .catch(() => expect(firstUnavailable).toHaveAttribute('aria-disabled', 'true'));
    }
  }

  async expectSelectedScanSummaryVisible(): Promise<void> {
    await expect(this.selectedScanSummary).toBeVisible({ timeout: 5_000 });
  }

  async expectContinueEnabled(): Promise<void> {
    await expect(this.continueButton).toBeEnabled();
  }
}
