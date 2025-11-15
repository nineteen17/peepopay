import { describe, it, expect } from 'vitest';
import {
  calculateRefundAmount,
  calculateNoShowFee,
  calculateFlexPassSplit,
  validateRefundAmount,
  getRefundPolicySummary,
  type RefundResult,
} from './refundCalculator.js';
import type { Booking } from '../db/schema/bookings.js';
import type { PolicySnapshot } from './policySnapshot.js';

describe('Refund Calculator Module', () => {
  // Mock policy snapshot
  const mockPolicySnapshot: PolicySnapshot = {
    serviceId: '550e8400-e29b-41d4-a716-446655440000',
    serviceName: 'Test Service',
    serviceVersion: new Date('2024-01-15T10:00:00Z'),
    snapshotCreatedAt: new Date('2024-01-20T10:00:00Z'),
    depositAmount: 10000, // $100.00
    depositType: 'fixed',
    fullPrice: 30000, // $300.00
    cancellationWindowHours: 24,
    minimumCancellationHours: 2,
    lateCancellationFee: 3000, // $30.00
    noShowFee: 5000, // $50.00
    allowPartialRefunds: true,
    autoRefundOnCancel: true,
    flexPassEnabled: true,
    flexPassPrice: 1000, // $10.00
    flexPassRevenueSharePercent: 60,
    flexPassRulesJson: null,
    protectionAddons: null,
  };

  // Mock booking without flex pass
  const createMockBooking = (overrides?: Partial<Booking>): Booking => ({
    id: '660e8400-e29b-41d4-a716-446655440000',
    serviceId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '770e8400-e29b-41d4-a716-446655440000',
    customerName: 'Test Customer',
    customerEmail: 'customer@example.com',
    customerPhone: '+1234567890',
    customerAddress: null,
    bookingDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    duration: 60, // 60 minutes
    notes: null,
    depositAmount: 10000,
    depositStatus: 'paid',
    status: 'confirmed',
    stripePaymentIntentId: null,
    stripeChargeId: null,
    cancellationTime: null,
    cancellationReason: null,
    refundAmount: null,
    refundReason: null,
    feeCharged: null,
    flexPassPurchased: false,
    flexPassFee: null,
    policySnapshotJson: mockPolicySnapshot as any,
    disputeStatus: 'none',
    disputeReason: null,
    disputeCreatedAt: null,
    disputeResolvedAt: null,
    verticalData: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('calculateRefundAmount', () => {
    it('should give full refund when cancelled within cancellation window', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(10000);
      expect(result.feeCharged).toBe(0);
      expect(result.reason).toBe('within_window');
      expect(result.hoursUntilBooking).toBeGreaterThan(24);
      expect(result.policyUsed).toBe('snapshot');
      expect(result.explanation).toContain('Free cancellation');
    });

    it('should apply late cancellation fee when cancelled outside window', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(7000); // $100 - $30 fee
      expect(result.feeCharged).toBe(3000);
      expect(result.reason).toBe('late_cancellation');
      expect(result.hoursUntilBooking).toBeGreaterThan(2);
      expect(result.hoursUntilBooking).toBeLessThan(24);
      expect(result.explanation).toContain('Late cancellation fee');
    });

    it('should give no refund when cancelled too close to booking time', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(0);
      expect(result.feeCharged).toBe(10000);
      expect(result.reason).toBe('no_refund_too_late');
      expect(result.hoursUntilBooking).toBeLessThan(2);
      expect(result.explanation).toContain('too close to booking time');
    });

    it('should give full refund with flex pass regardless of timing', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        flexPassPurchased: true,
        flexPassFee: 1000,
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(10000);
      expect(result.feeCharged).toBe(0);
      expect(result.reason).toBe('flex_pass_protection');
      expect(result.explanation).toContain('Flex Pass');
    });

    it('should return no refund if already refunded', () => {
      const booking = createMockBooking({
        depositStatus: 'refunded',
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(0);
      expect(result.feeCharged).toBe(0);
      expect(result.reason).toBe('already_refunded');
      expect(result.hoursUntilBooking).toBe(0);
    });

    it('should handle invalid deposit amount', () => {
      const booking = createMockBooking({
        depositAmount: 0,
      });

      expect(() => calculateRefundAmount(booking, new Date())).toThrow(
        'Invalid deposit amount'
      );
    });

    it('should return no refund if no policy snapshot exists', () => {
      const booking = createMockBooking({
        policySnapshotJson: null,
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(0);
      expect(result.feeCharged).toBe(10000);
      expect(result.reason).toBe('no_refund_policy');
      expect(result.policyUsed).toBe('none');
    });

    it('should handle service that does not allow refunds', () => {
      const noRefundPolicy: PolicySnapshot = {
        ...mockPolicySnapshot,
        allowPartialRefunds: false,
      };

      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        policySnapshotJson: noRefundPolicy as any,
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(0);
      expect(result.feeCharged).toBe(10000);
      expect(result.reason).toBe('no_refund_policy');
      expect(result.explanation).toContain('No refunds allowed');
    });

    it('should calculate refund at exact cancellation window boundary', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Exactly 24 hours
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(10000);
      expect(result.feeCharged).toBe(0);
      expect(result.reason).toBe('within_window');
    });

    it('should calculate refund at exact minimum cancellation boundary', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Exactly 2 hours
      });

      const result = calculateRefundAmount(booking, new Date());

      // Just at the boundary - should get partial refund
      expect(result.reason).toBe('late_cancellation');
      expect(result.refundAmount).toBe(7000);
    });
  });

  describe('calculateNoShowFee', () => {
    it('should return configured no-show fee from policy', () => {
      const booking = createMockBooking();

      const fee = calculateNoShowFee(booking);

      expect(fee).toBe(5000); // $50.00
    });

    it('should return deposit amount as fallback if no policy snapshot', () => {
      const booking = createMockBooking({
        policySnapshotJson: null,
      });

      const fee = calculateNoShowFee(booking);

      expect(fee).toBe(10000); // Full deposit amount
    });

    it('should return deposit amount if no-show fee not configured', () => {
      const policyWithoutNoShowFee: PolicySnapshot = {
        ...mockPolicySnapshot,
        noShowFee: null,
      };

      const booking = createMockBooking({
        policySnapshotJson: policyWithoutNoShowFee as any,
      });

      const fee = calculateNoShowFee(booking);

      expect(fee).toBe(10000); // Full deposit amount
    });
  });

  describe('calculateFlexPassSplit', () => {
    it('should split revenue correctly with 60% platform share', () => {
      const split = calculateFlexPassSplit(1000, 60);

      expect(split.platformAmount).toBe(600);
      expect(split.providerAmount).toBe(400);
      expect(split.totalAmount).toBe(1000);
      expect(split.platformPercentage).toBe(60);
      expect(split.providerPercentage).toBe(40);
    });

    it('should split revenue correctly with 70% platform share', () => {
      const split = calculateFlexPassSplit(1000, 70);

      expect(split.platformAmount).toBe(700);
      expect(split.providerAmount).toBe(300);
      expect(split.totalAmount).toBe(1000);
      expect(split.platformPercentage).toBe(70);
      expect(split.providerPercentage).toBe(30);
    });

    it('should handle large amounts correctly', () => {
      const split = calculateFlexPassSplit(10000, 60);

      expect(split.platformAmount).toBe(6000);
      expect(split.providerAmount).toBe(4000);
      expect(split.totalAmount).toBe(10000);
    });

    it('should round platform amount correctly', () => {
      // Test edge case with odd numbers
      const split = calculateFlexPassSplit(999, 60);

      expect(split.platformAmount).toBe(599); // Rounded 599.4
      expect(split.providerAmount).toBe(400); // 999 - 599
      expect(split.totalAmount).toBe(999);
    });

    it('should throw error for negative price', () => {
      expect(() => calculateFlexPassSplit(-1000, 60)).toThrow(
        'Flex pass price cannot be negative'
      );
    });

    it('should throw error for invalid platform share percentage', () => {
      expect(() => calculateFlexPassSplit(1000, 101)).toThrow(
        'Platform revenue share must be between 0 and 100'
      );

      expect(() => calculateFlexPassSplit(1000, -1)).toThrow(
        'Platform revenue share must be between 0 and 100'
      );
    });

    it('should handle zero flex pass price', () => {
      const split = calculateFlexPassSplit(0, 60);

      expect(split.platformAmount).toBe(0);
      expect(split.providerAmount).toBe(0);
      expect(split.totalAmount).toBe(0);
    });
  });

  describe('validateRefundAmount', () => {
    it('should return valid refund amount when within bounds', () => {
      const validated = validateRefundAmount(5000, 10000);
      expect(validated).toBe(5000);
    });

    it('should cap refund at deposit amount', () => {
      const validated = validateRefundAmount(15000, 10000);
      expect(validated).toBe(10000);
    });

    it('should set negative refunds to zero', () => {
      const validated = validateRefundAmount(-500, 10000);
      expect(validated).toBe(0);
    });

    it('should handle edge case of refund equal to deposit', () => {
      const validated = validateRefundAmount(10000, 10000);
      expect(validated).toBe(10000);
    });

    it('should handle zero refund', () => {
      const validated = validateRefundAmount(0, 10000);
      expect(validated).toBe(0);
    });
  });

  describe('getRefundPolicySummary', () => {
    it('should generate human-readable summary with all fees', () => {
      const summary = getRefundPolicySummary(mockPolicySnapshot);

      expect(summary).toContain('Free cancellation up to 24 hours');
      expect(summary).toContain('Late cancellation fee: $30.00');
      expect(summary).toContain('No-show fee: $50.00');
      expect(summary).toContain('Cancellation protection available for $10.00');
    });

    it('should omit fees not configured', () => {
      const minimalPolicy: PolicySnapshot = {
        ...mockPolicySnapshot,
        lateCancellationFee: null,
        noShowFee: null,
        flexPassEnabled: false,
        flexPassPrice: null,
      };

      const summary = getRefundPolicySummary(minimalPolicy);

      expect(summary).toContain('Free cancellation up to 24 hours');
      expect(summary).not.toContain('Late cancellation fee');
      expect(summary).not.toContain('No-show fee');
      expect(summary).not.toContain('Cancellation protection');
    });

    it('should include minimum cancellation hours if configured', () => {
      const summary = getRefundPolicySummary(mockPolicySnapshot);

      expect(summary).toContain('Must cancel at least 2 hours before');
    });
  });

  describe('Edge Cases and Timezone Handling', () => {
    it('should calculate hours correctly across timezones', () => {
      const booking = createMockBooking({
        bookingDate: new Date('2024-02-15T14:00:00Z'), // 2 PM UTC
      });

      const cancellationTime = new Date('2024-02-14T14:00:00Z'); // 24 hours before

      const result = calculateRefundAmount(booking, cancellationTime, 'UTC');

      expect(result.hoursUntilBooking).toBeCloseTo(24, 1);
      expect(result.reason).toBe('within_window');
    });

    it('should handle fractional hours correctly', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() + 23.5 * 60 * 60 * 1000), // 23.5 hours
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.hoursUntilBooking).toBeGreaterThan(23);
      expect(result.hoursUntilBooking).toBeLessThan(24);
      expect(result.reason).toBe('late_cancellation'); // Outside 24h window
    });

    it('should handle bookings in the past', () => {
      const booking = createMockBooking({
        bookingDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.hoursUntilBooking).toBeLessThan(0);
      expect(result.reason).toBe('no_refund_too_late');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle plumber cancelling 3 hours before appointment', () => {
      const booking = createMockBooking({
        depositAmount: 5000, // $50 deposit
        bookingDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
        policySnapshotJson: {
          ...mockPolicySnapshot,
          depositAmount: 5000,
          cancellationWindowHours: 24,
          lateCancellationFee: 2500, // $25 late fee
        } as any,
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(2500); // $50 - $25
      expect(result.feeCharged).toBe(2500);
      expect(result.reason).toBe('late_cancellation');
    });

    it('should handle customer with flex pass cancelling last minute', () => {
      const booking = createMockBooking({
        depositAmount: 10000,
        bookingDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        flexPassPurchased: true,
        flexPassFee: 1500,
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(10000); // Full refund
      expect(result.feeCharged).toBe(0);
      expect(result.reason).toBe('flex_pass_protection');
    });

    it('should handle dental appointment 48-hour policy', () => {
      const dentalPolicy: PolicySnapshot = {
        ...mockPolicySnapshot,
        cancellationWindowHours: 48,
        lateCancellationFee: 4000, // $40
        noShowFee: 8000, // $80
      };

      const booking = createMockBooking({
        depositAmount: 10000,
        bookingDate: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours
        policySnapshotJson: dentalPolicy as any,
      });

      const result = calculateRefundAmount(booking, new Date());

      expect(result.refundAmount).toBe(6000); // $100 - $40
      expect(result.feeCharged).toBe(4000);
      expect(result.reason).toBe('late_cancellation');
    });
  });
});
