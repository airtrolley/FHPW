import { test as base, expect } from '@playwright/test';
import { MemberAuthPage } from '../pages/MemberAuthPage';
import { PlanSelectionPage } from '../pages/PlanSelectionPage';
import { SchedulingPage } from '../pages/SchedulingPage';
import { PaymentPage } from '../pages/PaymentPage';
import { ConfirmationPage } from '../pages/ConfirmationPage';
import { TestDataFactory } from '../helpers/TestDataFactory';

// ─── Fixture types ────────────────────────────────────────────────────────────
type PageFixtures = {
  memberAuthPage: MemberAuthPage;
  planSelectionPage: PlanSelectionPage;
  schedulingPage: SchedulingPage;
  paymentPage: PaymentPage;
  confirmationPage: ConfirmationPage;
};

type HelperFixtures = {
  dataFactory: TestDataFactory;
};

type FHPWFixtures = PageFixtures & HelperFixtures;

// ─── Extend base test ─────────────────────────────────────────────────────────
export const test = base.extend<FHPWFixtures>({

  // ── Page objects (listed in flow order) ──────────────────────────────────────
  memberAuthPage: async ({ page }, use) => {
    await use(new MemberAuthPage(page));
  },
  planSelectionPage: async ({ page }, use) => {
    await use(new PlanSelectionPage(page));
  },
  schedulingPage: async ({ page }, use) => {
    await use(new SchedulingPage(page));
  },
  paymentPage: async ({ page }, use) => {
    await use(new PaymentPage(page));
  },
  confirmationPage: async ({ page }, use) => {
    await use(new ConfirmationPage(page));
  },

  // ── Test data factory ────────────────────────────────────────────────────────
  dataFactory: async ({}, use) => {
    await use(new TestDataFactory());
  },
});

export { expect };
