import { db } from '../../db/index.js';
import { bookings, services, insertBookingSchema, type NewBooking, type BookingStatus } from '../../db/schema/index.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { createPaymentIntent } from '../../lib/stripe.js';

export interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
}

/**
 * Bookings Service
 * Handles booking-related business logic and database operations
 */
export class BookingsService {
  /**
   * Get all bookings for a user with optional filters
   */
  async getUserBookings(userId: string, filters?: BookingFilters) {
    const userBookings = await db.query.bookings.findMany({
      where: eq(bookings.userId, userId),
      with: {
        service: true,
      },
      orderBy: (bookings, { desc }) => [desc(bookings.bookingDate)],
    });

    // Apply filters
    let filtered = userBookings;

    if (filters?.status) {
      filtered = filtered.filter((b) => b.status === filters.status);
    }

    if (filters?.from) {
      filtered = filtered.filter((b) => new Date(b.bookingDate) >= new Date(filters.from!));
    }

    if (filters?.to) {
      filtered = filtered.filter((b) => new Date(b.bookingDate) <= new Date(filters.to!));
    }

    return filtered;
  }

  /**
   * Get single booking by ID
   */
  async getBookingById(id: string, userId: string) {
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), eq(bookings.userId, userId)),
      with: {
        service: true,
        user: true,
      },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }

    return booking;
  }

  /**
   * Create a new booking (public endpoint - from widget)
   */
  async createBooking(data: NewBooking) {
    const validatedData = insertBookingSchema.parse(data);

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

    return {
      booking: updated,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(id: string, userId: string, status: BookingStatus) {
    // Verify ownership
    const existing = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), eq(bookings.userId, userId)),
    });

    if (!existing) {
      throw new AppError(404, 'Booking not found');
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return updated;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, userId: string) {
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), eq(bookings.userId, userId)),
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
      .where(eq(bookings.id, id))
      .returning();

    return updated;
  }

  /**
   * Update booking after successful payment
   */
  async confirmPayment(paymentIntentId: string, chargeId: string) {
    const [updated] = await db
      .update(bookings)
      .set({
        status: 'confirmed',
        stripeChargeId: chargeId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.stripePaymentIntentId, paymentIntentId))
      .returning();

    return updated;
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(paymentIntentId: string) {
    await db
      .update(bookings)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(bookings.stripePaymentIntentId, paymentIntentId));
  }
}
