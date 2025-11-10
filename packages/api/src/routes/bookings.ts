import { Router } from 'express';
import { db } from '../db/index.js';
import { bookings, insertBookingSchema } from '../db/schema/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { createPaymentIntent } from '../lib/stripe.js';

const router = Router();

// Get all bookings for authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status, from, to } = req.query;

    let query = db.query.bookings.findMany({
      where: eq(bookings.userId, req.user!.id),
      with: {
        service: true,
      },
      orderBy: (bookings, { desc }) => [desc(bookings.bookingDate)],
    });

    const userBookings = await query;

    // Apply filters
    let filtered = userBookings;

    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }

    if (from) {
      filtered = filtered.filter(b => new Date(b.bookingDate) >= new Date(from as string));
    }

    if (to) {
      filtered = filtered.filter(b => new Date(b.bookingDate) <= new Date(to as string));
    }

    res.json({ bookings: filtered });
  } catch (error) {
    next(error);
  }
});

// Get single booking
router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const booking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, req.params.id),
        eq(bookings.userId, req.user!.id)
      ),
      with: {
        service: true,
        user: true,
      },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }

    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Create booking (public - from widget)
router.post('/', async (req, res, next) => {
  try {
    const validatedData = insertBookingSchema.parse(req.body);

    // Get service to verify and get tradie's Stripe account
    const service = await db.query.services.findFirst({
      where: eq(services.id, validatedData.serviceId),
      with: {
        user: true,
      },
    });

    if (!service) {
      throw new AppError(404, 'Service not found');
    }

    if (!service.user.stripeAccountId) {
      throw new AppError(400, 'Tradie has not set up payments yet');
    }

    // Create booking
    const [newBooking] = await db
      .insert(bookings)
      .values({
        ...validatedData,
        userId: service.userId,
        status: 'pending',
      })
      .returning();

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount: validatedData.depositAmount,
      connectedAccountId: service.user.stripeAccountId,
      metadata: {
        bookingId: newBooking.id,
        serviceId: service.id,
        serviceName: service.name,
      },
    });

    // Update booking with payment intent ID
    const [updated] = await db
      .update(bookings)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(bookings.id, newBooking.id))
      .returning();

    res.status(201).json({
      booking: updated,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
});

// Update booking status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;

    // Verify ownership
    const existing = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, req.params.id),
        eq(bookings.userId, req.user!.id)
      ),
    });

    if (!existing) {
      throw new AppError(404, 'Booking not found');
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, req.params.id))
      .returning();

    res.json({ booking: updated });
  } catch (error) {
    next(error);
  }
});

// Cancel booking
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const booking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, req.params.id),
        eq(bookings.userId, req.user!.id)
      ),
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new AppError(400, 'Booking is already cancelled');
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, req.params.id))
      .returning();

    res.json({ booking: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
