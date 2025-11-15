import { differenceInHours, differenceInMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Booking } from '../db/schema/bookings.js';
import { getPolicyFromSnapshot, type PolicySnapshot } from './policySnapshot.js';

/**
 * RefundResult - Structured result of refund calculation
 */
export interface RefundResult {
  refundAmount: number; // Amount to refund in cents
  feeCharged: number; // Fee charged to customer in cents
  reason: RefundReason; // Machine-readable reason code
  explanation: string; // Human-readable explanation
  calculatedAt: Date; // When calculation was performed
  hoursUntilBooking: number; // Hours from cancellation to booking
  policyUsed: 'snapshot' | 'current_service' | 'none'; // Which policy was used
}

/**
 * Refund reason codes
 */
export type RefundReason =
  | 'within_window' // Cancelled within free cancellation window
  | 'late_cancellation' // Cancelled outside window, partial refund
  | 'flex_pass_protection' // Flex pass purchased, full refund
  | 'no_refund_too_late' // Too close to booking time, no refund
  | 'no_refund_policy' // Service doesn't allow refunds
  | 'no_show' // Customer didn't show up
  | 'already_refunded'; // Already refunded

/**
 * Flex pass revenue split result
 */
export interface FlexPassSplit {
  platformAmount: number; // Platform's share in cents
  providerAmount: number; // Provider's share in cents
  totalAmount: number; // Total flex pass price in cents
  platformPercentage: number; // Platform's percentage (60-70%)
  providerPercentage: number; // Provider's percentage (30-40%)
}

/**
 * Calculate refund amount based on cancellation timing and policy
 *
 * @param booking - The booking being cancelled
 * @param cancellationTime - When the cancellation is happening
 * @param userTimezone - User's timezone for accurate calculations (default: 'UTC')
 * @returns RefundResult with refund amount, fees, and explanation
 *
 * @example
 * const result = calculateRefundAmount(booking, new Date(), 'America/New_York');
 * console.log(result);
 * // {
 * //   refundAmount: 5000,
 * //   feeCharged: 0,
 * //   reason: 'within_window',
 * //   explanation: 'Cancelled 48 hours before booking...'
 * // }
 */
export function calculateRefundAmount(
  booking: Booking,
  cancellationTime: Date = new Date(),
  userTimezone: string = 'UTC'
): RefundResult {
  const calculatedAt = new Date();

  // Check if already refunded
  if (booking.depositStatus === 'refunded' || booking.status === 'refunded') {
    return {
      refundAmount: 0,
      feeCharged: 0,
      reason: 'already_refunded',
      explanation: 'Booking has already been refunded',
      calculatedAt,
      hoursUntilBooking: 0,
      policyUsed: 'none',
    };
  }

  // Validate deposit amount
  const depositAmount = booking.depositAmount;
  if (!depositAmount || depositAmount <= 0) {
    throw new Error('Invalid deposit amount: must be greater than 0');
  }

  // Get policy snapshot (CRITICAL: always use snapshot, not current service policy)
  const policy = getPolicyFromSnapshot(booking);

  if (!policy) {
    console.warn(
      `No policy snapshot found for booking ${booking.id}, cannot calculate refund accurately`
    );
    // Fallback: no refund if we don't have a policy
    return {
      refundAmount: 0,
      feeCharged: depositAmount,
      reason: 'no_refund_policy',
      explanation:
        'No refund policy available. Please contact support for assistance.',
      calculatedAt,
      hoursUntilBooking: 0,
      policyUsed: 'none',
    };
  }

  // FLEX PASS OVERRIDE: Full refund if flex pass purchased
  if (booking.flexPassPurchased) {
    return {
      refundAmount: depositAmount,
      feeCharged: 0,
      reason: 'flex_pass_protection',
      explanation: `Full refund due to cancellation protection purchased (Flex Pass for ${formatCurrency(booking.flexPassFee || 0)})`,
      calculatedAt,
      hoursUntilBooking: calculateHoursUntilBooking(
        cancellationTime,
        booking.bookingDate,
        userTimezone
      ),
      policyUsed: 'snapshot',
    };
  }

  // Calculate time until booking
  const hoursUntilBooking = calculateHoursUntilBooking(
    cancellationTime,
    booking.bookingDate,
    userTimezone
  );

  // Check if refunds are allowed at all
  if (!policy.allowPartialRefunds && hoursUntilBooking < policy.cancellationWindowHours) {
    return {
      refundAmount: 0,
      feeCharged: depositAmount,
      reason: 'no_refund_policy',
      explanation: `No refunds allowed for this service. Cancellation window: ${policy.cancellationWindowHours} hours`,
      calculatedAt,
      hoursUntilBooking,
      policyUsed: 'snapshot',
    };
  }

  // Check if within minimum cancellation time (too late to cancel)
  if (hoursUntilBooking < policy.minimumCancellationHours) {
    return {
      refundAmount: 0,
      feeCharged: depositAmount,
      reason: 'no_refund_too_late',
      explanation: `Cancellation too close to booking time. Minimum required: ${policy.minimumCancellationHours} hours, time remaining: ${hoursUntilBooking.toFixed(1)} hours`,
      calculatedAt,
      hoursUntilBooking,
      policyUsed: 'snapshot',
    };
  }

  // Within free cancellation window - full refund
  if (hoursUntilBooking >= policy.cancellationWindowHours) {
    return {
      refundAmount: depositAmount,
      feeCharged: 0,
      reason: 'within_window',
      explanation: `Cancelled ${hoursUntilBooking.toFixed(1)} hours before booking. Free cancellation window: ${policy.cancellationWindowHours} hours`,
      calculatedAt,
      hoursUntilBooking,
      policyUsed: 'snapshot',
    };
  }

  // Outside window - apply late cancellation fee
  const lateFee = policy.lateCancellationFee || 0;
  const refundAmount = Math.max(0, depositAmount - lateFee);

  return {
    refundAmount,
    feeCharged: lateFee,
    reason: 'late_cancellation',
    explanation: `Cancelled ${hoursUntilBooking.toFixed(1)} hours before booking (outside ${policy.cancellationWindowHours}-hour window). Late cancellation fee: ${formatCurrency(lateFee)}. Refund: ${formatCurrency(refundAmount)}`,
    calculatedAt,
    hoursUntilBooking,
    policyUsed: 'snapshot',
  };
}

/**
 * Calculate no-show fee from policy snapshot
 *
 * @param booking - The booking that was a no-show
 * @returns Fee amount in cents
 *
 * @example
 * const fee = calculateNoShowFee(booking);
 * console.log(fee); // 5000 ($50.00)
 */
export function calculateNoShowFee(booking: Booking): number {
  const policy = getPolicyFromSnapshot(booking);

  if (!policy) {
    console.warn(
      `No policy snapshot found for booking ${booking.id}, using deposit amount as no-show fee`
    );
    // Fallback: charge the full deposit
    return booking.depositAmount;
  }

  // Use configured no-show fee, or default to full deposit
  return policy.noShowFee || booking.depositAmount;
}

/**
 * Calculate revenue split for flex pass purchase
 *
 * @param flexPassPrice - Total flex pass price in cents
 * @param platformRevenueSharePercent - Platform's share (60-70%)
 * @returns FlexPassSplit with breakdown of revenue
 *
 * @example
 * const split = calculateFlexPassSplit(1000, 60);
 * console.log(split);
 * // {
 * //   platformAmount: 600,
 * //   providerAmount: 400,
 * //   totalAmount: 1000,
 * //   platformPercentage: 60,
 * //   providerPercentage: 40
 * // }
 */
export function calculateFlexPassSplit(
  flexPassPrice: number,
  platformRevenueSharePercent: number = 60
): FlexPassSplit {
  // Validate inputs
  if (flexPassPrice < 0) {
    throw new Error('Flex pass price cannot be negative');
  }

  if (platformRevenueSharePercent < 0 || platformRevenueSharePercent > 100) {
    throw new Error('Platform revenue share must be between 0 and 100');
  }

  const platformAmount = Math.round(flexPassPrice * (platformRevenueSharePercent / 100));
  const providerAmount = flexPassPrice - platformAmount;
  const providerPercentage = 100 - platformRevenueSharePercent;

  return {
    platformAmount,
    providerAmount,
    totalAmount: flexPassPrice,
    platformPercentage: platformRevenueSharePercent,
    providerPercentage,
  };
}

/**
 * Validate refund amount doesn't exceed deposit
 *
 * @param refundAmount - Calculated refund amount
 * @param depositAmount - Original deposit amount
 * @returns Validated refund amount (capped at deposit)
 */
export function validateRefundAmount(refundAmount: number, depositAmount: number): number {
  if (refundAmount < 0) {
    console.warn(`Invalid negative refund amount: ${refundAmount}, setting to 0`);
    return 0;
  }

  if (refundAmount > depositAmount) {
    console.warn(
      `Refund amount ${refundAmount} exceeds deposit ${depositAmount}, capping at deposit`
    );
    return depositAmount;
  }

  return refundAmount;
}

/**
 * Calculate hours from cancellation time to booking time
 * Handles timezone conversions for accurate calculations
 *
 * @param cancellationTime - When cancellation is happening
 * @param bookingDate - When the booking is scheduled
 * @param timezone - User's timezone (default: 'UTC')
 * @returns Hours until booking (can be negative if booking is in past)
 */
function calculateHoursUntilBooking(
  cancellationTime: Date,
  bookingDate: Date,
  timezone: string = 'UTC'
): number {
  // Convert both dates to the same timezone for accurate calculation
  const cancellationInTz = new Date(
    formatInTimeZone(cancellationTime, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX")
  );
  const bookingInTz = new Date(
    formatInTimeZone(bookingDate, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX")
  );

  // Calculate difference in hours (can be fractional)
  const hours = differenceInHours(bookingInTz, cancellationInTz);
  const minutes = differenceInMinutes(bookingInTz, cancellationInTz);

  // Return precise hours (e.g., 23.5 hours)
  return minutes / 60;
}

/**
 * Format cents to currency string
 *
 * @param amountInCents - Amount in cents
 * @param currency - Currency code (default: 'AUD')
 * @returns Formatted currency string
 */
function formatCurrency(amountInCents: number, currency: string = 'AUD'): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Get a human-readable summary of refund policy from snapshot
 *
 * @param policy - Policy snapshot
 * @returns Summary string
 */
export function getRefundPolicySummary(policy: PolicySnapshot): string {
  const parts: string[] = [];

  parts.push(`Free cancellation up to ${policy.cancellationWindowHours} hours before booking`);

  if (policy.lateCancellationFee) {
    parts.push(
      `Late cancellation fee: ${formatCurrency(policy.lateCancellationFee)} (if cancelled within ${policy.cancellationWindowHours} hours)`
    );
  }

  if (policy.minimumCancellationHours > 0) {
    parts.push(
      `Must cancel at least ${policy.minimumCancellationHours} hours before booking`
    );
  }

  if (policy.noShowFee) {
    parts.push(`No-show fee: ${formatCurrency(policy.noShowFee)}`);
  }

  if (policy.flexPassEnabled && policy.flexPassPrice) {
    parts.push(
      `Cancellation protection available for ${formatCurrency(policy.flexPassPrice)} (cancel anytime for full refund)`
    );
  }

  return parts.join('. ') + '.';
}
