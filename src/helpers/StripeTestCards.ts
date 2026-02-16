import { PaymentMethod, StripeCardType } from '../types';

/**
 * StripeTestCards — all test card numbers from https://docs.stripe.com/testing
 * These cards only work in Stripe's test/staging mode.
 */
export const StripeTestCards: Record<StripeCardType, PaymentMethod> = {
  valid: {
    cardNumber: '4242424242424242',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '10001',
    name: 'Test Member',
  },
  declined: {
    cardNumber: '4000000000000002',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '10001',
    name: 'Test Member',
  },
  insufficient_funds: {
    cardNumber: '4000000000009995',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '10001',
    name: 'Test Member',
  },
  requires_3ds: {
    cardNumber: '4000002500003155',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '10001',
    name: 'Test Member',
  },
};

// Additional Stripe test cards for edge cases
export const STRIPE_EXTRA_CARDS = {
  // Card with incorrect CVC
  incorrectCvc: {
    cardNumber: '4000000000000127',
    expMonth: '12',
    expYear: '2030',
    cvc: '999',
    zip: '10001',
  },
  // Expired card
  expiredCard: {
    cardNumber: '4000000000000069',
    expMonth: '12',
    expYear: '2020', // expired
    cvc: '424',
    zip: '10001',
  },
  // Incorrect ZIP code
  incorrectZip: {
    cardNumber: '4000000000000010',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '99999',
  },
  // Visa Debit
  visaDebit: {
    cardNumber: '4000056655665556',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '10001',
  },
  // Mastercard
  mastercard: {
    cardNumber: '5555555555554444',
    expMonth: '12',
    expYear: '2030',
    cvc: '424',
    zip: '10001',
  },
} as const;

/**
 * Get test card for a specific scenario.
 */
export function getTestCard(type: StripeCardType): PaymentMethod {
  return StripeTestCards[type];
}

/**
 * Format a card number with spaces (as displayed in UI).
 * Stripe's test input accepts both formatted and unformatted.
 */
export function formatCardNumber(number: string): string {
  return number.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
}
