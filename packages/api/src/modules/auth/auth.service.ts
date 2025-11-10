import { auth } from '../../lib/auth.js';

/**
 * Auth Service
 * Handles authentication business logic
 */
export class AuthService {
  /**
   * Get session from headers
   */
  async getSession(headers: any) {
    try {
      const session = await auth.api.getSession({ headers });
      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate if a session exists
   */
  async validateSession(headers: any): Promise<boolean> {
    const session = await this.getSession(headers);
    return !!session;
  }
}
