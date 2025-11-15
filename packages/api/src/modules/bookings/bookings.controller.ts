import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { BookingsService } from './bookings.service.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();
const bookingsService = new BookingsService();

/**
 * Bookings Controller
 * Handles booking-related HTTP requests
 */

// Get all bookings for authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status, from, to } = req.query;

    const userBookings = await bookingsService.getUserBookings(req.user!.id, {
      status: status as string,
      from: from as string,
      to: to as string,
    });

    res.json({ bookings: userBookings });
  } catch (error) {
    next(error);
  }
});

// Get single booking
router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const booking = await bookingsService.getBookingById(req.params.id, req.user!.id);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Create booking (public - from widget)
router.post('/', async (req, res, next) => {
  try {
    const result = await bookingsService.createBooking(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Update booking status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const booking = await bookingsService.updateBookingStatus(req.params.id, req.user!.id, status);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Cancel booking
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const booking = await bookingsService.cancelBooking(req.params.id, req.user!.id);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Mark booking as no-show (provider only)
router.post('/:id/no-show', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const booking = await bookingsService.markBookingAsNoShow(req.params.id, req.user!.id);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Create dispute for booking (customer only)
router.post('/:id/dispute', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError(400, 'Dispute reason is required');
    }

    const booking = await bookingsService.createDispute(
      req.params.id,
      req.user!.id,
      reason.trim()
    );

    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Resolve dispute (admin only - TODO: add admin middleware)
router.post('/:id/dispute/resolve', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { resolution, notes } = req.body;

    if (!resolution || !['customer', 'provider'].includes(resolution)) {
      throw new AppError(400, 'Resolution must be either "customer" or "provider"');
    }

    const booking = await bookingsService.resolveDispute(
      req.params.id,
      req.user!.id,
      resolution as 'customer' | 'provider',
      notes || ''
    );

    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

export default router;
