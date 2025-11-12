import { db } from '../../db/index.js';
import { bookings, services, insertBookingSchema, type NewBooking, type BookingStatus } from '../../db/schema/index.js';
import { eq, and, gte, lte, lt, or } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { createPaymentIntent } from '../../lib/stripe.js';
import { QueueService } from '../../lib/queue.js';

export interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
}

/**
 * Booking state machine - defines valid status transitions
 */
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [], // Terminal state
  completed: ['refunded'],
  refunded: [], // Terminal state
};

/**
 * Validate if a status transition is allowed
 */
function validateStatusTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
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
   * Check for booking conflicts
   * Returns true if there's a conflict, false if slot is available
   */
  async checkBookingConflict(
    userId: string,
    bookingDate: Date,
    duration: number
  ): Promise<boolean> {
    const endTime = new Date(bookingDate.getTime() + duration * 60000);

    const conflicts = await db.query.bookings.findMany({
      where: and(
        eq(bookings.userId, userId),
        or(
          eq(bookings.status, 'confirmed'),
          eq(bookings.status, 'pending')
        ),
        // Check for time overlap: booking starts before our slot ends AND booking ends after our slot starts
        lt(bookings.bookingDate, endTime)
      ),
      with: {
        service: true,
      },
    });

    // Check if any existing booking overlaps with the new slot
    for (const booking of conflicts) {
      const bookingStart = new Date(booking.bookingDate);
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

      // Check for overlap: existing booking ends after new slot starts
      if (bookingEnd > bookingDate) {
        return true; // Conflict found
      }
    }

    return false; // No conflicts
  }

  /**
   * Create a new booking (public endpoint - from widget)
   */
  async createBooking(data: NewBooking) {
    const validatedData = insertBookingSchema.parse(data);

    // Use transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // 1. Get service to verify and get tradie's Stripe account
      const service = await tx.query.services.findFirst({
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

      // 2. Check for booking conflicts
      const bookingDate = new Date(validatedData.bookingDate);
      const hasConflict = await this.checkBookingConflict(
        service.userId,
        bookingDate,
        validatedData.duration
      );

      if (hasConflict) {
        throw new AppError(409, 'This time slot is no longer available. Please select a different time.');
      }

      // 3. Create payment intent
      const paymentIntent = await createPaymentIntent({
        amount: validatedData.depositAmount,
        connectedAccountId: service.user.stripeAccountId,
        metadata: {
          serviceId: service.id,
          serviceName: service.name,
          customerEmail: validatedData.customerEmail,
          customerName: validatedData.customerName,
        },
      });

      // 4. Create booking with payment intent ID
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          ...validatedData,
          userId: service.userId,
          status: 'pending',
          depositStatus: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          bookingDate,
        })
        .returning();

      return {
        booking: newBooking,
        clientSecret: paymentIntent.client_secret,
      };
    });
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

    // Validate status transition
    if (!validateStatusTransition(existing.status as BookingStatus, status)) {
      throw new AppError(
        400,
        `Invalid status transition from '${existing.status}' to '${status}'`
      );
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

    // Validate status transition using state machine
    if (!validateStatusTransition(booking.status as BookingStatus, 'cancelled')) {
      throw new AppError(
        400,
        `Cannot cancel booking with status '${booking.status}'`
      );
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
        depositStatus: 'paid',
        stripeChargeId: chargeId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.stripePaymentIntentId, paymentIntentId))
      .returning();

    // Get full booking details with service info
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, updated.id),
      with: {
        service: true,
      },
    });

    if (booking && booking.service) {
      // Publish booking confirmation email to queue
      const queueService = new QueueService();
      await queueService.publishBookingConfirmation(
        booking.id,
        booking.customerEmail,
        {
          serviceName: booking.service.name,
          scheduledFor: booking.bookingDate,
          duration: booking.service.duration,
          price: booking.depositAmount,
        }
      );
    }

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
        depositStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(bookings.stripePaymentIntentId, paymentIntentId));
  }
}
