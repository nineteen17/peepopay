import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { createConnectAccount, createAccountLink, isAccountOnboarded } from '../lib/stripe.js';
import { config } from '../config/index.js';

const router = Router();

// Get current user profile
router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Don't send password hash
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, businessName, phone, timezone, avatar } = req.body;

    const [updated] = await db
      .update(users)
      .set({
        name,
        businessName,
        phone,
        timezone,
        avatar,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.id))
      .returning();

    const { passwordHash, ...userWithoutPassword } = updated;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
});

// Get user by slug (public)
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.slug, req.params.slug),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Only return public fields
    const publicUser = {
      id: user.id,
      name: user.name,
      businessName: user.businessName,
      slug: user.slug,
      avatar: user.avatar,
    };

    res.json({ user: publicUser });
  } catch (error) {
    next(error);
  }
});

// Start Stripe Connect onboarding
router.post('/stripe/onboard', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

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
        .where(eq(users.id, user.id));
    }

    // Create account link for onboarding
    const returnUrl = `${config.apiUrl}/users/stripe/return`;
    const refreshUrl = `${config.apiUrl}/users/stripe/refresh`;

    const accountLink = await createAccountLink(accountId, returnUrl, refreshUrl);

    res.json({ url: accountLink.url });
  } catch (error) {
    next(error);
  }
});

// Stripe onboarding return
router.get('/stripe/return', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user?.stripeAccountId) {
      throw new AppError(400, 'No Stripe account found');
    }

    // Check if onboarding is complete
    const onboarded = await isAccountOnboarded(user.stripeAccountId);

    if (onboarded) {
      await db
        .update(users)
        .set({ stripeOnboarded: true })
        .where(eq(users.id, user.id));
    }

    // Redirect to dashboard
    res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard?onboarding=success`);
  } catch (error) {
    next(error);
  }
});

// Stripe onboarding refresh
router.get('/stripe/refresh', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user?.stripeAccountId) {
      throw new AppError(400, 'No Stripe account found');
    }

    // Create new account link
    const returnUrl = `${config.apiUrl}/users/stripe/return`;
    const refreshUrl = `${config.apiUrl}/users/stripe/refresh`;

    const accountLink = await createAccountLink(user.stripeAccountId, returnUrl, refreshUrl);

    res.redirect(accountLink.url);
  } catch (error) {
    next(error);
  }
});

export default router;
