import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { BookingsService } from './bookings.service.js';

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

export default router;
