import { db } from '../../db/index.js';
import { bookings, services, insertBookingSchema, type NewBooking, type BookingStatus } from '../../db/schema/index.js';
import { eq, and, lt, or } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { createPaymentIntent, createRefund } from '../../lib/stripe.js';
import { createQueueService } from '../../lib/queue.js';
import { scheduleBookingReminder, cancelBookingReminder } from '../../lib/bull.js';
import { createPolicySnapshot } from '../../lib/policySnapshot.js';
import { calculateRefundAmount, validateRefundAmount } from '../../lib/refundCalculator.js';

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
  confirmed: ['completed', 'cancelled', 'no_show'],
  cancelled: [], // Terminal state
  completed: ['refunded'],
  refunded: [], // Terminal state
  no_show: ['refunded'], // Can be refunded if disputed
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
    const validatedData = insertBookingSchema.parse(data) as unknown as NewBooking;

    // Use transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // 1. Get service to verify and get provider's Stripe account
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
        throw new AppError(400, 'Provider has not set up payments yet');
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

      // 3. Create policy snapshot to preserve policy at time of booking
      const policySnapshot = createPolicySnapshot(service);
      console.log(`Policy snapshot created for booking - service: ${service.id}, version: ${service.updatedAt.toISOString()}`);

      // 4. Create payment intent
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

      // 5. Create booking with payment intent ID and policy snapshot
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          ...validatedData,
          userId: service.userId,
          status: 'pending',
          depositStatus: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          bookingDate,
          policySnapshotJson: policySnapshot as any, // Store policy snapshot as JSONB
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
    // Verify ownership and fetch full booking details
    const existing = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), eq(bookings.userId, userId)),
      with: {
        service: {
          with: {
            user: true,
          },
        },
      },
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

    // Send completion emails to both customer and provider when status is completed
    if (status === 'completed' && existing.service && existing.service.user) {
      const queueService = createQueueService();
      await queueService.publishBookingCompletion(
        existing.id,
        existing.customerEmail,
        existing.service.user.email,
        {
          serviceName: existing.service.name,
          duration: existing.service.duration,
          price: existing.depositAmount,
          customerName: existing.customerName,
          providerName: existing.service.user.name,
          bookingDate: existing.bookingDate,
        }
      );
    }

    return updated;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, userId: string) {
    // Get booking with service and user details
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), eq(bookings.userId, userId)),
      with: {
        service: {
          with: {
            user: true,
          },
        },
      },
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

    // Calculate refund using policy snapshot and cancellation timing
    const cancellationTime = new Date();
    const refundResult = calculateRefundAmount(
      booking,
      cancellationTime,
      'UTC' // TODO: Use customer's timezone when available
    );

    console.log(`📊 Refund calculation for booking ${id}:`, {
      reason: refundResult.reason,
      refundAmount: refundResult.refundAmount,
      feeCharged: refundResult.feeCharged,
      hoursUntilBooking: refundResult.hoursUntilBooking.toFixed(1),
      explanation: refundResult.explanation,
    });

    // Process refund if payment was made and refund is due
    let stripeRefundId: string | undefined;
    if (booking.depositStatus === 'paid' && booking.stripePaymentIntentId) {
      if (refundResult.refundAmount > 0) {
        try {
          // Validate refund amount doesn't exceed deposit
          const validatedAmount = validateRefundAmount(
            refundResult.refundAmount,
            booking.depositAmount
          );

          const refund = await createRefund({
            paymentIntentId: booking.stripePaymentIntentId,
            amount: validatedAmount,
            reason: refundResult.reason,
            metadata: {
              bookingId: booking.id,
              refundReason: refundResult.reason,
              feeCharged: refundResult.feeCharged.toString(),
              refundAmount: validatedAmount.toString(),
              hoursUntilBooking: refundResult.hoursUntilBooking.toFixed(1),
              policyUsed: refundResult.policyUsed,
            },
          });

          stripeRefundId = refund.id;
          console.log(`✅ Refund processed: ${refund.id} for booking ${id} - Amount: $${(validatedAmount / 100).toFixed(2)}`);
        } catch (error) {
          console.error('Failed to process refund:', error);
          // Continue with cancellation even if refund fails
          // Admin will need to handle refund manually
        }
      } else {
        console.log(`ℹ️  No refund due for booking ${id}: ${refundResult.explanation}`);
      }
    }

    // Update booking status with refund tracking fields
    const [updated] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        depositStatus: refundResult.refundAmount > 0 ? 'refunded' : booking.depositStatus,
        cancellationTime,
        cancellationReason: refundResult.explanation,
        refundAmount: refundResult.refundAmount,
        refundReason: refundResult.reason,
        feeCharged: refundResult.feeCharged,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    // Send cancellation emails to both customer and provider
    if (booking.service && booking.service.user) {
      const queueService = createQueueService();
      await queueService.publishBookingCancellation(
        booking.id,
        booking.customerEmail,
        booking.service.user.email,
        {
          serviceName: booking.service.name,
          duration: booking.service.duration,
          price: booking.depositAmount,
          customerName: booking.customerName,
          providerName: booking.service.user.name,
          bookingDate: booking.bookingDate,
          refundAmount: refundResult.refundAmount > 0 ? refundResult.refundAmount : undefined,
        }
      );
    }

    // Cancel scheduled reminder
    try {
      await cancelBookingReminder(booking.id);
    } catch (error) {
      console.error(`❌ Failed to cancel reminder for booking ${booking.id}:`, error);
      // Don't fail the cancellation if reminder cancellation fails
    }

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
      const queueService = createQueueService();
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

      // Schedule booking reminder for 24 hours before
      try {
        const bookingDate = new Date(booking.bookingDate);
        const reminderDate = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

        // Only schedule if reminder date is in the future
        if (reminderDate.getTime() > Date.now()) {
          await scheduleBookingReminder(
            booking.id,
            booking.customerEmail,
            booking.customerName,
            booking.service.name,
            bookingDate,
            reminderDate
          );
          console.log(`📅 Reminder scheduled for booking ${booking.id}`);
        } else {
          console.log(`⚠️  Booking ${booking.id} is less than 24 hours away, skipping reminder`);
        }
      } catch (error) {
        console.error(`❌ Failed to schedule reminder for booking ${booking.id}:`, error);
        // Don't fail the payment confirmation if reminder scheduling fails
      }
    }

    return updated;
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(paymentIntentId: string, failureReason?: string) {
    // Get booking with service details
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.stripePaymentIntentId, paymentIntentId),
      with: {
        service: true,
      },
    });

    if (!booking) {
      console.error(`Booking not found for payment intent: ${paymentIntentId}`);
      throw new AppError(404, 'Booking not found for payment intent');
    }

    // Update booking status
    const [updated] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        depositStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    // Send payment failure email to customer
    if (booking.service) {
      const queueService = createQueueService();
      await queueService.publishPaymentFailure(
        booking.id,
        booking.customerEmail,
        {
          serviceName: booking.service.name,
          customerName: booking.customerName,
          bookingDate: booking.bookingDate,
          amount: booking.depositAmount,
          failureReason,
        }
      );
    }

    return updated;
  }
}
