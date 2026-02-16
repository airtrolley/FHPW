import { APIRequestContext, APIResponse } from '@playwright/test';
import { AuthTokens, QuestionnaireResponse } from '../types';

/**
 * ApiClient — typed wrapper around Playwright's APIRequestContext.
 *
 */
export class ApiClient {
  private request: APIRequestContext;
  private baseUrl: string;
  private authToken?: string;

  constructor(request: APIRequestContext, baseUrl: string) {
    this.request = request;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  /**
   * Login and capture the Bearer token.
   * Stores token internally for subsequent requests.
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await this.request.post(`${this.baseUrl}/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json();
    const token = body.access_token ?? body.accessToken ?? body.token ?? body.data?.token;
    if (!token) {
      throw new Error(`Login failed: ${JSON.stringify(body)}`);
    }
    this.authToken = token;
    return { accessToken: token };
  }

  setToken(token: string): void {
    this.authToken = token;
  }

  getToken(): string {
    if (!this.authToken) throw new Error('No auth token set. Call login() first.');
    return this.authToken;
  }

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // ─── Member ──────────────────────────────────────────────────────────────

  async getCurrentMember(): Promise<{ id: string; email: string }> {
    const res = await this.request.get(`${this.baseUrl}/members/me`, {
      headers: this.authHeaders(),
    });
    await this.assertOk(res, 'GET /members/me');
    const body = await res.json();
    return body.data ?? body;
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async getMemberBookings(): Promise<Array<{ id: string; memberId: string }>> {
    const res = await this.request.get(`${this.baseUrl}/bookings`, {
      headers: this.authHeaders(),
    });
    await this.assertOk(res, 'GET /bookings');
    const body = await res.json();
    return body.data ?? body;
  }

  async getBooking(bookingId: string): Promise<{ id: string; memberId: string }> {
    const res = await this.request.get(`${this.baseUrl}/bookings/${bookingId}`, {
      headers: this.authHeaders(),
    });
    await this.assertOk(res, `GET /bookings/${bookingId}`);
    const body = await res.json();
    return body.data ?? body;
  }

  // ─── Medical Questionnaire ────────────────────────────────────────────────

  /**
   * Attempt to GET another member's questionnaire.
   * Returns the raw APIResponse so tests can inspect status code.
   */
  async getQuestionnaire(questionnaireId: string): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/questionnaires/${questionnaireId}`, {
      headers: this.authHeaders(),
    });
  }

  /**
   * Attempt to GET questionnaire scoped to a booking ID.
   * Core of the privacy test.
   */
  async getQuestionnaireByBooking(bookingId: string): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/bookings/${bookingId}/questionnaire`, {
      headers: this.authHeaders(),
    });
  }

  /**
   * Attempt to SUBMIT answers to another member's questionnaire.
   * Should return 403 if caller doesn't own the booking.
   */
  async submitQuestionnaireAnswers(
    questionnaireId: string,
    payload: Partial<QuestionnaireResponse>
  ): Promise<APIResponse> {
    return this.request.post(
      `${this.baseUrl}/questionnaires/${questionnaireId}/answers`,
      {
        headers: this.authHeaders(),
        data: payload,
      }
    );
  }

  /**
   * Attempt to PATCH questionnaire belonging to another member.
   */
  async patchQuestionnaire(
    questionnaireId: string,
    payload: Record<string, unknown>
  ): Promise<APIResponse> {
    return this.request.patch(
      `${this.baseUrl}/questionnaires/${questionnaireId}`,
      {
        headers: this.authHeaders(),
        data: payload,
      }
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Verify that a response is NOT a data leak —
   * i.e., the caller did not receive another member's medical data.
   *
   * Acceptable responses: 403 Forbidden, 401 Unauthorized, 404 Not Found
   * NOT acceptable: 200 OK (data leak)
   */
  static assertAccessDenied(response: APIResponse, description: string): void {
    const status = response.status();
    const allowed = [401, 403, 404];
    if (!allowed.includes(status)) {
      throw new Error(
        `SECURITY VIOLATION — ${description}: expected ${allowed.join('/')} but got ${status}. ` +
        `This indicates a potential data leak.`
      );
    }
    // Prefer 403 over 404 — 404 can enable resource enumeration
    if (status === 403 || status === 401) return;
    // 404 is acceptable but log a recommendation
    if (status === 404) {
      console.warn(
        `[Privacy] ${description}: returned 404. ` +
        `Consider returning 403 to clearly communicate "access denied" vs "not found".`
      );
    }
  }

  private async assertOk(res: APIResponse, label: string): Promise<void> {
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`${label} failed with ${res.status()}: ${body}`);
    }
  }
}
