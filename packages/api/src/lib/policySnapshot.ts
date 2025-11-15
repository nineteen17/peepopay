import { z } from 'zod';
import type { Service } from '../db/schema/services.js';
import type { Booking } from '../db/schema/bookings.js';

/**
 * PolicySnapshot - Immutable record of service policy at time of booking
 *
 * CRITICAL: This snapshot ensures that policy changes to a service do NOT affect
 * existing bookings. When calculating refunds/fees, always use the snapshot,
 * never the current service policy.
 */
export interface PolicySnapshot {
  // Service identification
  serviceId: string;
  serviceName: string;
  serviceVersion: Date; // service.updatedAt at time of snapshot
  snapshotCreatedAt: Date;

  // Pricing (for reference)
  depositAmount: number;
  depositType: 'percentage' | 'fixed';
  fullPrice: number | null;

  // Cancellation Policy
  cancellationWindowHours: number; // Hours before booking to cancel for full refund
  minimumCancellationHours: number; // Minimum hours before booking to cancel
  lateCancellationFee: number | null; // Fee in cents for late cancellations
  noShowFee: number | null; // Fee in cents for no-shows
  allowPartialRefunds: boolean; // Allow partial refunds based on timing
  autoRefundOnCancel: boolean; // Automatically process refunds

  // Flex Pass (Cancellation Protection)
  flexPassEnabled: boolean; // Was flex pass available at booking time?
  flexPassPrice: number | null; // Price in cents
  flexPassRevenueSharePercent: number; // Platform's share (60-70%)
  flexPassRulesJson: Record<string, any> | null; // Custom flex pass rules

  // Protection Addons
  protectionAddons: Array<{
    id: string;
    name: string;
    price: number;
    rules: Record<string, any>;
  }> | null; // Industry-specific addons available
}

/**
 * Zod schema for validating policy snapshots
 */
export const policySnapshotSchema = z.object({
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1),
  serviceVersion: z.coerce.date(),
  snapshotCreatedAt: z.coerce.date(),

  depositAmount: z.number().int().nonnegative(),
  depositType: z.enum(['percentage', 'fixed']),
  fullPrice: z.number().int().nonnegative().nullable(),

  cancellationWindowHours: z.number().int().nonnegative(),
  minimumCancellationHours: z.number().int().nonnegative(),
  lateCancellationFee: z.number().int().nonnegative().nullable(),
  noShowFee: z.number().int().nonnegative().nullable(),
  allowPartialRefunds: z.boolean(),
  autoRefundOnCancel: z.boolean(),

  flexPassEnabled: z.boolean(),
  flexPassPrice: z.number().int().nonnegative().nullable(),
  flexPassRevenueSharePercent: z.number().int().min(0).max(100),
  flexPassRulesJson: z.record(z.any()).nullable(),

  protectionAddons: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().int().nonnegative(),
    rules: z.record(z.any()),
  })).nullable(),
});

/**
 * Creates a policy snapshot from a service at booking time
 *
 * @param service - The service being booked
 * @returns PolicySnapshot - Immutable policy record
 *
 * @example
 * const snapshot = createPolicySnapshot(service);
 * // Store in booking.policySnapshotJson
 */
export function createPolicySnapshot(service: Service): PolicySnapshot {
  // Parse protection addons from JSONB if present
  let parsedAddons = null;
  if (service.protectionAddons) {
    try {
      // If it's already an object, use it; if it's a string, parse it
      const addonsData = typeof service.protectionAddons === 'string'
        ? JSON.parse(service.protectionAddons)
        : service.protectionAddons;

      // Ensure it's an array
      if (Array.isArray(addonsData)) {
        parsedAddons = addonsData;
      }
    } catch (error) {
      console.error('Failed to parse protection addons:', error);
      parsedAddons = null;
    }
  }

  // Parse flex pass rules from JSONB if present
  let parsedFlexPassRules = null;
  if (service.flexPassRulesJson) {
    try {
      parsedFlexPassRules = typeof service.flexPassRulesJson === 'string'
        ? JSON.parse(service.flexPassRulesJson)
        : service.flexPassRulesJson;
    } catch (error) {
      console.error('Failed to parse flex pass rules:', error);
      parsedFlexPassRules = null;
    }
  }

  const snapshot: PolicySnapshot = {
    // Service identification
    serviceId: service.id,
    serviceName: service.name,
    serviceVersion: service.updatedAt,
    snapshotCreatedAt: new Date(),

    // Pricing
    depositAmount: service.depositAmount,
    depositType: service.depositType || 'fixed',
    fullPrice: service.fullPrice,

    // Cancellation Policy
    cancellationWindowHours: service.cancellationWindowHours ?? 24,
    minimumCancellationHours: service.minimumCancellationHours ?? 2,
    lateCancellationFee: service.lateCancellationFee,
    noShowFee: service.noShowFee,
    allowPartialRefunds: service.allowPartialRefunds ?? true,
    autoRefundOnCancel: service.autoRefundOnCancel ?? true,

    // Flex Pass
    flexPassEnabled: service.flexPassEnabled ?? false,
    flexPassPrice: service.flexPassPrice,
    flexPassRevenueSharePercent: service.flexPassRevenueSharePercent ?? 60,
    flexPassRulesJson: parsedFlexPassRules,

    // Protection Addons
    protectionAddons: parsedAddons,
  };

  return snapshot;
}

/**
 * Retrieves the policy snapshot from a booking
 *
 * @param booking - The booking containing the policy snapshot
 * @returns PolicySnapshot or null if not available
 *
 * @throws Error if snapshot is invalid
 *
 * @example
 * const policy = getPolicyFromSnapshot(booking);
 * if (policy) {
 *   const refund = calculateRefund(policy, booking);
 * }
 */
export function getPolicyFromSnapshot(booking: Booking): PolicySnapshot | null {
  if (!booking.policySnapshotJson) {
    return null;
  }

  try {
    // Parse JSONB field
    const snapshotData = typeof booking.policySnapshotJson === 'string'
      ? JSON.parse(booking.policySnapshotJson)
      : booking.policySnapshotJson;

    // Validate the snapshot
    const validatedSnapshot = policySnapshotSchema.parse(snapshotData);

    return validatedSnapshot as PolicySnapshot;
  } catch (error) {
    console.error('Failed to parse policy snapshot:', error);
    throw new Error('Invalid policy snapshot in booking');
  }
}

/**
 * Validates a policy snapshot
 *
 * @param snapshot - The policy snapshot to validate
 * @returns boolean - True if valid, false otherwise
 *
 * @example
 * if (validatePolicySnapshot(snapshot)) {
 *   // Safe to use snapshot
 * }
 */
export function validatePolicySnapshot(snapshot: unknown): boolean {
  try {
    policySnapshotSchema.parse(snapshot);
    return true;
  } catch (error) {
    console.error('Policy snapshot validation failed:', error);
    return false;
  }
}

/**
 * Checks if a booking has a valid policy snapshot
 *
 * @param booking - The booking to check
 * @returns boolean - True if booking has a valid snapshot
 *
 * @example
 * if (!hasValidPolicySnapshot(booking)) {
 *   console.warn('Booking missing policy snapshot - using service policy as fallback');
 * }
 */
export function hasValidPolicySnapshot(booking: Booking): boolean {
  if (!booking.policySnapshotJson) {
    return false;
  }

  try {
    const snapshot = getPolicyFromSnapshot(booking);
    return snapshot !== null;
  } catch {
    return false;
  }
}

/**
 * Gets a human-readable summary of the policy
 *
 * @param snapshot - The policy snapshot
 * @returns string - Formatted policy summary
 *
 * @example
 * const summary = getPolicySummary(snapshot);
 * // "Cancel within 24 hours for full refund. Late fee: $30. No-show fee: $50."
 */
export function getPolicySummary(snapshot: PolicySnapshot): string {
  const parts: string[] = [];

  // Cancellation window
  parts.push(`Cancel within ${snapshot.cancellationWindowHours} hours for full refund`);

  // Late cancellation fee
  if (snapshot.lateCancellationFee) {
    const feeInDollars = (snapshot.lateCancellationFee / 100).toFixed(2);
    parts.push(`Late cancellation fee: $${feeInDollars}`);
  }

  // No-show fee
  if (snapshot.noShowFee) {
    const feeInDollars = (snapshot.noShowFee / 100).toFixed(2);
    parts.push(`No-show fee: $${feeInDollars}`);
  }

  // Flex pass
  if (snapshot.flexPassEnabled && snapshot.flexPassPrice) {
    const flexPassInDollars = (snapshot.flexPassPrice / 100).toFixed(2);
    parts.push(`Cancellation protection available for $${flexPassInDollars}`);
  }

  return parts.join('. ') + '.';
}
