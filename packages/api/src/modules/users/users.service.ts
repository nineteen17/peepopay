import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { createConnectAccount, createAccountLink, isAccountOnboarded } from '../../lib/stripe.js';
import { config } from '../../config/index.js';

export interface UpdateUserData {
  name?: string;
  businessName?: string;
  phone?: string;
  timezone?: string;
  avatar?: string;
}

/**
 * Users Service
 * Handles user-related business logic and database operations
 */
export class UsersService {
  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by slug (public)
   */
  async getUserBySlug(slug: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.slug, slug),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Only return public fields
    return {
      id: user.id,
      name: user.name,
      businessName: user.businessName,
      slug: user.slug,
      avatar: user.avatar,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, data: UpdateUserData) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    const { passwordHash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  /**
   * Start Stripe Connect onboarding
   */
  async startStripeOnboarding(userId: string) {
    const user = await this.getUserById(userId);

    let accountId = user.stripeAccountId;

    // Create Stripe account if doesn't exist
    if (!accountId) {
      const account = await createConnectAccount({
        email: user.email,
        businessName: user.businessName || user.name,
      });

      accountId = account.id;

      // Save account ID
      await db
        .update(users)
        .set({ stripeAccountId: accountId })
        .where(eq(users.id, userId));
    }

    // Create account link for onboarding
    const returnUrl = `${config.apiUrl}/api/users/stripe/return`;
    const refreshUrl = `${config.apiUrl}/api/users/stripe/refresh`;

    const accountLink = await createAccountLink(accountId, returnUrl, refreshUrl);

    return { url: accountLink.url };
  }

  /**
   * Handle Stripe onboarding return
   */
  async handleStripeReturn(userId: string) {
    const user = await this.getUserById(userId);

    if (!user.stripeAccountId) {
      throw new AppError(400, 'No Stripe account found');
    }

    // Check if onboarding is complete
    const onboarded = await isAccountOnboarded(user.stripeAccountId);

    if (onboarded) {
      await db
        .update(users)
        .set({ stripeOnboarded: true })
        .where(eq(users.id, userId));
    }

    return { onboarded };
  }

  /**
   * Refresh Stripe onboarding link
   */
  async refreshStripeOnboarding(userId: string) {
    const user = await this.getUserById(userId);

    if (!user.stripeAccountId) {
      throw new AppError(400, 'No Stripe account found');
    }

    // Create new account link
    const returnUrl = `${config.apiUrl}/api/users/stripe/return`;
    const refreshUrl = `${config.apiUrl}/api/users/stripe/refresh`;

    const accountLink = await createAccountLink(user.stripeAccountId, returnUrl, refreshUrl);

    return { url: accountLink.url };
  }
}
