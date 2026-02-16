
## Setup

### Prerequisites

- Node.js >= 18
- npm >= 9

### Install

```bash
npm install
npx playwright install --with-deps chromium 
```

### Configure environment
Fill in environment url and credentials in FHPW/.env file

## Run Tests

```bash
# TC-01 — Complete signup-to-booking workflow
npx playwright test tests/e2e/workflow.spec.ts --headed

# TC-02 — New member signup & login verification
npx playwright test tests/onboarding/signup.spec.ts --headed

# TC-03 — Declined card error handling
npx playwright test tests/booking/declined-card.spec.ts --headed
```

---

## Test Cases

| ID | Test Case | Location |
|---|-----------|----------|
| **TC-01** | Complete signup-to-booking workflow | `tests/e2e/workflow.spec.ts` |
| **TC-02** | New member signup & login verification | `tests/onboarding/signup.spec.ts` |
| **TC-03** | Declined card error handling | `tests/booking/declined-card.spec.ts` |

---

## Project Structure

```
fhpw/
├── src/
│   ├── api/
│   │   └── ApiClient.ts             # HTTP client for API interactions
│   ├── pages/
│   │   ├── BasePage.ts              # Base page object
│   │   ├── ConfirmationPage.ts      # Booking confirmation
│   │   ├── MemberAuthPage.ts        # Login & registration
│   │   ├── PaymentPage.ts           # Payment 
│   │   ├── PlanSelectionPage.ts     # Demographics & scan selection
│   │   └── SchedulingPage.ts        # Location & date/time scheduling
│   ├── fixtures/
│   │   └── index.ts                 # Custom test fixtures
│   ├── helpers/
│   │   ├── StripeTestCards.ts       # Stripe test card configurations
│   │   └── TestDataFactory.ts       # Test data generation
│   └── types/
│       └── index.ts                 # TypeScript interfaces
├── tests/
│   ├── e2e/
│   │   └── workflow.spec.ts         # End-to-end booking test
│   ├── booking/
│   │   └── declined-card.spec.ts    # Declined card test
│   └── onboarding/
│       └── signup.spec.ts           # Signup flow test
├── playwright.config.ts
├── .env
└── README.md
```
