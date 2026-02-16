import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ScanType } from '../types';

/**
 * PlanSelectionPage — handles the plan/scan selection step after signup.
 *
 * URL pattern: /select-plan
 *
 * This page collects:
 * - Date of birth
 * - Sex
 * - Scan plan choice (e.g. MRI Scan at $999)
 */
export class PlanSelectionPage extends BasePage {
  readonly dobInput: Locator;
  readonly sexDropdown: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly selectYourPlanButton: Locator;
  readonly scanOptions: Locator;

  constructor(page: Page) {
    super(page);

    this.dobInput = page.getByRole('textbox', { name: /date of birth/i });
    this.sexDropdown = page.getByRole('combobox');
    this.continueButton = page.getByTestId('select-plan-submit-btn')
      .or(page.getByRole('button', { name: /continue|next/i }));
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.selectYourPlanButton = page.getByRole('button', { name: /select your plan/i });
    this.scanOptions = page.getByRole('listitem');
  }

  // ─── Waits / Assertions ──────────────────────────────────────────────────

  /** Wait for the plan selection page to fully load. */
  async expectPageLoaded(): Promise<void> {
    await expect(this.selectYourPlanButton).toBeVisible({ timeout: 10_000 });
    await expect(this.cancelButton).toBeVisible();
    await expect(this.cancelButton).toBeEnabled();
  }

  /** Wait for scan options to be rendered. */
  async waitForScanOptions(): Promise<void> {
    await this.page.waitForURL(/select-plan|scan-selection/, { timeout: 15_000 });
    await expect(this.scanOptions.first()).toBeVisible({ timeout: 10_000 });
  }

  /** Verify a scan option is displayed (optionally with a specific price). */
  async expectScanVisible(scanName: string, price?: number): Promise<void> {
    let card = this.scanOptions.filter({ hasText: new RegExp(scanName, 'i') });
    if (price) {
      card = card.filter({ hasText: `$${price}` });
    }
    await expect(card).toBeVisible({ timeout: 10_000 });
  }

  // ─── Demographics ────────────────────────────────────────────────────────

  /** Fill the date of birth field. */
  async fillDateOfBirth(dob: string): Promise<void> {
    await this.dobInput.click();
    await this.dobInput.fill(dob);
  }

  /** Select sex from the dropdown. */
  async selectSex(sex: 'male' | 'female'): Promise<void> {
    await this.sexDropdown.click();
    await this.page.getByRole('option', { name: new RegExp(sex, 'i') }).first().click();
  }

  /** Fill all demographics (DOB + sex). */
  async fillDemographics(dob: string, sex: 'male' | 'female'): Promise<void> {
    await this.fillDateOfBirth(dob);
    await this.selectSex(sex);
  }

  // ─── Scan Selection ──────────────────────────────────────────────────────

  /** Select a scan by its type identifier (e.g. 'full-body', 'heart'). */
  async selectScan(scanType: ScanType): Promise<void> {
    const card = this.scanOptions.filter({ hasText: new RegExp(scanType, 'i') });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
  }

  /** Select the first available scan option. */
  async selectFirstAvailableScan(): Promise<void> {
    await expect(this.scanOptions.first()).toBeVisible({ timeout: 10_000 });
    await this.scanOptions.first().click();
  }

  /** Select a scan plan by its display price text (e.g. 'Available at $999'). */
  async selectScanByPrice(priceText: string): Promise<void> {
    await this.scanOptions.filter({ hasText: priceText }).click();
  }

  /** Select the MRI Scan plan (default test plan). */
  async selectMriScan(): Promise<void> {
    await this.selectScanByPrice('Available at $999');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  /** Click Continue after selecting a plan. */
  async clickContinue(): Promise<void> {
    await expect(this.continueButton).toBeEnabled({ timeout: 5_000 });
    await this.continueButton.click();
  }

  /**
   * Complete the entire plan selection step:
   * fill demographics → select scan → continue.
   */
  async completePlanSelection(
    options: { dob?: string; sex?: 'male' | 'female' } = {},
  ): Promise<void> {
    const { dob = '01-01-1988', sex = 'male' } = options;
    await this.fillDemographics(dob, sex);
    await this.selectMriScan();
    await this.clickContinue();
  }
}
