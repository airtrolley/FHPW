// ─── User / Auth ─────────────────────────────────────────────────────────────
export interface Credentials {
  email: string;
  password: string;
}

export interface MemberProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  phone?: string;
  email: string;
  password?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// ─── Booking / Scans ─────────────────────────────────────────────────────────
export type ScanType = 'full-body' | 'organ-screen' | 'heart' | 'brain' | 'lung';

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface PaymentMethod {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  zip?: string;
  name?: string;
}

export type StripeCardType = 'valid' | 'declined' | 'insufficient_funds' | 'requires_3ds';

// ─── Medical Questionnaire ────────────────────────────────────────────────────
export interface QuestionnaireResponse {
  memberId: string;
  questionnaireId: string;
  responses: Array<{
    questionId: string;
    answer: string | boolean | string[];
  }>;
}
