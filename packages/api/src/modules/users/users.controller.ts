import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { UsersService } from './users.service.js';

const router = Router();
const usersService = new UsersService();

/**
 * Users Controller
 * Handles user-related HTTP requests
 */

// Get current user profile
router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await usersService.getUserById(req.user!.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await usersService.updateUser(req.user!.id, req.body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Get user by slug (public)
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const user = await usersService.getUserBySlug(req.params.slug);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Start Stripe Connect onboarding
router.post('/stripe/onboard', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await usersService.startStripeOnboarding(req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Stripe onboarding return
router.get('/stripe/return', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    await usersService.handleStripeReturn(req.user!.id);

    // Redirect to dashboard
    res.redirect(
      `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard?onboarding=success`
    );
  } catch (error) {
    next(error);
  }
});

// Stripe onboarding refresh
router.get('/stripe/refresh', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await usersService.refreshStripeOnboarding(req.user!.id);
    res.redirect(result.url);
  } catch (error) {
    next(error);
  }
});

export default router;
