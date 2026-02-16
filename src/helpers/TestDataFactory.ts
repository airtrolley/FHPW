import { faker } from '@faker-js/faker';
import { MemberProfile, Credentials } from '../types';

/**
 * TestDataFactory — generates test data for test automation.
 */
export class TestDataFactory {
  /**
   * Generate a password that meets all validation rules:
   * - 8 or more characters
   * - Upper + lowercase letters
   * - At least one number or symbol
   * - No repetitive characters (e.g. 'bbb')
   * - No sequential characters (e.g. 'abc', '123', '321' or 'cba')
   */
  private generateValidPassword(): string {
    const symbols = '!@#$%^&*';

    let password = '';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      attempts++;
      password = '';

      // Generate random base of 8-12 characters
      const length = faker.number.int({ min: 8, max: 12 });

      // Ensure at least one uppercase letter
      password += faker.string.alpha({ length: 1, casing: 'upper' });

      // Ensure at least one lowercase letter
      password += faker.string.alpha({ length: 1, casing: 'lower' });

      // Ensure at least one number or symbol
      if (faker.datatype.boolean()) {
        password += faker.string.numeric({ length: 1 });
      } else {
        password += symbols[faker.number.int({ min: 0, max: symbols.length - 1 })];
      }

      // Fill the rest with random alphanumeric + symbols
      const remaining = length - password.length;
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + symbols;
      for (let i = 0; i < remaining; i++) {
        password += chars[faker.number.int({ min: 0, max: chars.length - 1 })];
      }

      // Shuffle the password
      password = password
        .split('')
        .sort(() => faker.number.int({ min: -1, max: 1 }))
        .join('');

      // Validate against all rules
      if (this.isValidPassword(password)) {
        return password;
      }
    }

    // Fallback if generation fails (should be rare)
    return 'TestPassword123!Secure';
  }

  /**
   * Validate password against all rules.
   * Returns true if password meets all requirements, false otherwise.
   */
  private isValidPassword(password: string): boolean {
    // Rule 1: 8 or more characters
    if (password.length < 8) {
      return false;
    }

    // Rule 2: Upper + lowercase letters
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      return false;
    }

    // Rule 3: At least one number or symbol
    if (!/[\d!@#$%^&*]/.test(password)) {
      return false;
    }

    // Rule 4: No repetitive characters (3+ same chars in a row)
    if (/(.)\1{2,}/.test(password)) {
      return false;
    }

    // Rule 5: No sequential characters
    // Check for ascending sequences: abc, 123, etc.
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);

      // Ascending: each char is 1 more than previous
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return false;
      }

      // Descending: each char is 1 less than previous
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate a new member registration profile.
   * Email includes timestamp to ensure uniqueness across test runs.
   */
  createMemberProfile(overrides: Partial<MemberProfile & { password: string }> = {}): MemberProfile & { password: string } {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    return {
      firstName,
      lastName,
      email: `billy-test-${Date.now()}-${faker.string.alphanumeric(4)}@mailtest.example.com`,
      dateOfBirth: faker.date
        .birthdate({ min: 30, max: 70, mode: 'age' })
        .toISOString()
        .split('T')[0], // YYYY-MM-DD
      phone: faker.phone.number({ style: 'national' }),
      password: this.generateValidPassword(),
      ...overrides,
    };
  }

  /**
   * Credentials for the hub (staff) portal — from assessment.
   */
  hubCredentials(): Credentials {
    const email = process.env.HUB_USERNAME;
    const password = process.env.HUB_PASSWORD;
    
    if (!email || !password) {
      throw new Error('HUB_USERNAME and HUB_PASSWORD environment variables must be set');
    }
    
    return { email, password };
  }

  /**
   * Generate a plausible (fake) UUID for negative tests.
   */
  fakeId(): string {
    return faker.string.uuid();
  }
}
