import { db } from '../db/index.js';
import { bookings } from '../db/schema/bookings.js';
import { eq, and, lt } from 'drizzle-orm';
import type { Booking } from '../db/schema/bookings.js';
import { calculateNoShowFee } from './refundCalculator.js';
import { createQueueService } from './queue.js';

/**
 * Grace period in hours after booking time before marking as no-show
 * This gives customers time if they're running late
 */
const NO_SHOW_GRACE_PERIOD_HOURS = 2;

/**
 * Check for bookings that should be marked as no-shows
 *
 * Finds bookings where:
 * - Status is 'confirmed'
 * - Booking date is more than grace period hours in the past
 *
 * @returns Array of bookings that are potential no-shows
 *
 * @example
 * const noShows = await checkForNoShows();
 * console.log(`Found ${noShows.length} potential no-shows`);
 */
export async function checkForNoShows(): Promise<Booking[]> {
  const gracePeriodMs = NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - gracePeriodMs);

  console.log(`🔍 Checking for no-shows with cutoff time: ${cutoffTime.toISOString()}`);

  const potentialNoShows = await db.query.bookings.findMany({
    where: and(
      eq(bookings.status, 'confirmed'),
      lt(bookings.bookingDate, cutoffTime)
    ),
    with: {
      service: {
        with: {
          user: true,
        },
      },
    },
  });

  console.log(`📊 Found ${potentialNoShows.length} potential no-show bookings`);

  return potentialNoShows;
}

/**
 * Mark a booking as no-show
 *
 * Updates booking status, records no-show fee, and sends notifications
 *
 * @param bookingId - ID of the booking to mark as no-show
 * @param markedByUserId - ID of the user marking it (provider or system)
 * @returns Updated booking
 *
 * @example
 * const booking = await markAsNoShow('booking-id', 'provider-id');
 * console.log(`Marked booking ${booking.id} as no-show. Fee: $${booking.feeCharged / 100}`);
 */
export async function markAsNoShow(
  bookingId: string,
  markedByUserId?: string
): Promise<Booking> {
  // Fetch booking with related data
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      service: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  // Validate current status
  if (booking.status !== 'confirmed') {
    throw new Error(
      `Cannot mark booking as no-show. Current status: ${booking.status}. Must be 'confirmed'.`
    );
  }

  // Validate booking ownership if marked by user (not system)
  if (markedByUserId && booking.service.userId !== markedByUserId) {
    throw new Error(
      `User ${markedByUserId} does not have permission to mark booking ${bookingId} as no-show`
    );
  }

  // Calculate no-show fee from policy snapshot
  const noShowFee = calculateNoShowFee(booking);

  console.log(`💰 No-show fee for booking ${bookingId}: $${(noShowFee / 100).toFixed(2)}`);

  // Update booking status
  const [updatedBooking] = await db
    .update(bookings)
    .set({
      status: 'no_show',
      feeCharged: noShowFee,
      cancellationTime: new Date(), // Track when marked as no-show
      cancellationReason: markedByUserId
        ? `Marked as no-show by provider`
        : `Automatically detected no-show (${NO_SHOW_GRACE_PERIOD_HOURS}h grace period exceeded)`,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))
    .returning();

  console.log(`✅ Booking ${bookingId} marked as no-show`);

  // Send notifications
  if (booking.service && booking.service.user) {
    try {
      const queueService = createQueueService();

      // TODO: Create dedicated no-show notification email
      // For now, we'll use the cancellation email with no-show context
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
          refundAmount: 0, // No refund for no-shows
        }
      );

      console.log(`📧 No-show notification sent for booking ${bookingId}`);
    } catch (error) {
      console.error(`❌ Failed to send no-show notification for booking ${bookingId}:`, error);
      // Don't fail the no-show marking if notification fails
    }
  }

  return updatedBooking;
}

/**
 * Process all detected no-shows
 *
 * Checks for no-shows and marks them appropriately
 *
 * @returns Summary of processed no-shows
 *
 * @example
 * const summary = await processNoShows();
 * console.log(`Processed ${summary.totalProcessed} no-shows`);
 */
export async function processNoShows(): Promise<{
  totalFound: number;
  totalProcessed: number;
  totalFailed: number;
  errors: Array<{ bookingId: string; error: string }>;
}> {
  const startTime = Date.now();
  console.log(`🚀 Starting no-show detection process...`);

  const potentialNoShows = await checkForNoShows();
  const totalFound = potentialNoShows.length;

  if (totalFound === 0) {
    console.log(`✅ No-show detection complete. No no-shows found.`);
    return {
      totalFound: 0,
      totalProcessed: 0,
      totalFailed: 0,
      errors: [],
    };
  }

  let totalProcessed = 0;
  let totalFailed = 0;
  const errors: Array<{ bookingId: string; error: string }> = [];

  // Process each no-show
  for (const booking of potentialNoShows) {
    try {
      await markAsNoShow(booking.id); // System-triggered, no userId
      totalProcessed++;
    } catch (error) {
      totalFailed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({
        bookingId: booking.id,
        error: errorMessage,
      });
      console.error(`❌ Failed to process no-show for booking ${booking.id}:`, errorMessage);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ No-show detection complete in ${duration}ms`);
  console.log(`📊 Summary: ${totalFound} found, ${totalProcessed} processed, ${totalFailed} failed`);

  return {
    totalFound,
    totalProcessed,
    totalFailed,
    errors,
  };
}

/**
 * Get no-show statistics for a provider
 *
 * @param providerId - Provider user ID
 * @param fromDate - Start date for statistics (optional)
 * @param toDate - End date for statistics (optional)
 * @returns No-show statistics
 */
export async function getNoShowStatistics(
  providerId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<{
  totalNoShows: number;
  totalFeesCharged: number;
  averageFee: number;
}> {
  // Build where conditions
  const conditions = [eq(bookings.status, 'no_show')];

  // Note: We'd need to join with services to filter by providerId
  // For now, this is a placeholder - implementation would need proper join

  const noShowBookings = await db.query.bookings.findMany({
    where: and(...conditions),
  });

  const totalNoShows = noShowBookings.length;
  const totalFeesCharged = noShowBookings.reduce(
    (sum, booking) => sum + (booking.feeCharged || 0),
    0
  );
  const averageFee = totalNoShows > 0 ? totalFeesCharged / totalNoShows : 0;

  return {
    totalNoShows,
    totalFeesCharged,
    averageFee,
  };
}
