import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkForNoShows,
  markAsNoShow,
  processNoShows,
  getNoShowStatistics,
} from './noShowDetection.js';
import type { Booking } from '../db/schema/bookings.js';
import type { PolicySnapshot } from './policySnapshot.js';

/**
 * No-Show Detection Module Tests
 *
 * Tests for:
 * - checkForNoShows() - Finding bookings past grace period
 * - markAsNoShow() - Marking booking as no-show with fee calculation
 * - processNoShows() - Batch processing with error handling
 * - getNoShowStatistics() - Provider analytics
 */

// Mock dependencies
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      bookings: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  },
}));

vi.mock('./queue.js', () => ({
  createQueueService: vi.fn(() => ({
    publishNoShowNotification: vi.fn(),
  })),
}));

describe('No-Show Detection Module', () => {
  const mockPolicySnapshot: PolicySnapshot = {
    serviceId: '550e8400-e29b-41d4-a716-446655440000',
    serviceName: 'Test Service',
    serviceVersion: new Date('2024-01-15T10:00:00Z'),
    snapshotCreatedAt: new Date('2024-01-20T10:00:00Z'),
    depositAmount: 10000,
    depositType: 'fixed',
    fullPrice: 30000,
    cancellationWindowHours: 24,
    minimumCancellationHours: 2,
    lateCancellationFee: 3000,
    noShowFee: 5000,
    allowPartialRefunds: true,
    autoRefundOnCancel: true,
    flexPassEnabled: false,
    flexPassPrice: null,
    flexPassRevenueSharePercent: 60,
    flexPassRulesJson: null,
    protectionAddons: null,
  };

  const createMockBooking = (overrides?: Partial<Booking>): Booking => ({
    id: '660e8400-e29b-41d4-a716-446655440000',
    serviceId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '770e8400-e29b-41d4-a716-446655440000',
    customerName: 'Test Customer',
    customerEmail: 'customer@example.com',
    customerPhone: '+1234567890',
    customerAddress: null,
    bookingDate: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    duration: 60,
    notes: null,
    depositAmount: 10000,
    depositStatus: 'paid',
    status: 'confirmed',
    stripePaymentIntentId: 'pi_test_123',
    stripeChargeId: 'ch_test_123',
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

  describe('checkForNoShows', () => {
    it('should find confirmed bookings past grace period', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = createMockBooking({
        bookingDate: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        status: 'confirmed',
      });

      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([mockBooking] as any);

      const result = await checkForNoShows();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockBooking.id);
      expect(result[0].status).toBe('confirmed');
    });

    it('should not find bookings within grace period', async () => {
      const { db } = await import('../db/index.js');

      // Mock returns empty array (bookings within grace period are filtered by DB query)
      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([] as any);

      const result = await checkForNoShows();

      expect(result).toHaveLength(0);
    });

    it('should not find already-processed bookings', async () => {
      const { db } = await import('../db/index.js');

      // Mock returns empty array (non-confirmed bookings are filtered by DB query)
      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([] as any);

      const result = await checkForNoShows();

      expect(result).toHaveLength(0);
    });

    it('should return bookings with service and user details', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = {
        ...createMockBooking(),
        service: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Service',
          user: {
            id: '770e8400-e29b-41d4-a716-446655440000',
            email: 'provider@example.com',
            name: 'Test Provider',
          },
        },
      } as any;

      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([mockBooking] as any);

      const result = await checkForNoShows();

      expect(result[0]).toHaveProperty('service');
      expect((result[0] as any).service).toHaveProperty('user');
    });
  });

  describe('markAsNoShow', () => {
    it('should mark booking as no-show and charge fee', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = createMockBooking();
      const mockUpdatedBooking = {
        ...mockBooking,
        status: 'no_show',
        feeCharged: 5000, // noShowFee from policy
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking as any);
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockUpdatedBooking]),
          }),
        }),
      } as any);

      const result = await markAsNoShow(mockBooking.id);

      expect(result.status).toBe('no_show');
      expect(result.feeCharged).toBe(5000);
    });

    it('should throw error if booking not found', async () => {
      const { db } = await import('../db/index.js');

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(null as any);

      await expect(markAsNoShow('nonexistent-id')).rejects.toThrow('Booking nonexistent-id not found');
    });

    it('should throw error if booking is not confirmed', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = createMockBooking({
        status: 'cancelled',
      });

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking as any);

      await expect(markAsNoShow(mockBooking.id)).rejects.toThrow(
        'Cannot mark booking as no-show. Current status: cancelled'
      );
    });

    it('should validate provider ownership when markedByUserId provided', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = {
        ...createMockBooking(),
        service: {
          userId: 'different-user-id',
        } as any,
      } as any;

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking as any);

      await expect(markAsNoShow(mockBooking.id, 'wrong-user-id')).rejects.toThrow(
        'does not have permission to mark booking'
      );
    });

    it('should use deposit amount as fallback if no policy snapshot', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = createMockBooking({
        policySnapshotJson: null,
      });
      const mockUpdatedBooking = {
        ...mockBooking,
        status: 'no_show',
        feeCharged: 10000, // Full deposit amount as fallback
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking as any);
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockUpdatedBooking]),
          }),
        }),
      } as any);

      const result = await markAsNoShow(mockBooking.id);

      expect(result.feeCharged).toBe(10000); // Full deposit
    });

    it('should send notification to customer and provider', async () => {
      const { db } = await import('../db/index.js');
      const { createQueueService } = await import('./queue.js');

      const mockBooking = {
        ...createMockBooking(),
        service: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Service',
          duration: 60,
          user: {
            id: '770e8400-e29b-41d4-a716-446655440000',
            email: 'provider@example.com',
            name: 'Test Provider',
          },
        } as any,
      } as any;
      const mockUpdatedBooking = {
        ...mockBooking,
        status: 'no_show',
        feeCharged: 5000,
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking as any);
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockUpdatedBooking]),
          }),
        }),
      } as any);

      const mockPublish = vi.fn();
      vi.mocked(createQueueService).mockReturnValueOnce({
        publishNoShowNotification: mockPublish,
      } as any);

      await markAsNoShow(mockBooking.id);

      expect(mockPublish).toHaveBeenCalledWith(
        mockBooking.id,
        mockBooking.customerEmail,
        mockBooking.service.user.email,
        expect.objectContaining({
          serviceName: 'Test Service',
          feeCharged: 5000, // No-show fee from policy snapshot
        })
      );
    });

    it('should record who marked the booking (system vs provider)', async () => {
      const { db } = await import('../db/index.js');
      const mockBooking = {
        ...createMockBooking(),
        service: {
          userId: 'provider-123',
        } as any,
      } as any;
      const mockUpdatedBooking = {
        ...mockBooking,
        status: 'no_show',
        feeCharged: 5000,
        cancellationReason: 'Marked as no-show by provider',
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking as any);
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockUpdatedBooking]),
          }),
        }),
      } as any);

      const result = await markAsNoShow(mockBooking.id, 'provider-123');

      expect(result.cancellationReason).toContain('Marked as no-show by provider');
    });
  });

  describe('processNoShows', () => {
    it('should process multiple no-shows successfully', async () => {
      const { db } = await import('../db/index.js');

      const mockBooking1 = createMockBooking({ id: 'booking-1' });
      const mockBooking2 = createMockBooking({ id: 'booking-2' });

      // First call: checkForNoShows
      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([mockBooking1, mockBooking2] as any);

      // Subsequent calls: markAsNoShow for each booking
      vi.mocked(db.query.bookings.findFirst)
        .mockResolvedValueOnce(mockBooking1 as any)
        .mockResolvedValueOnce(mockBooking2 as any);

      vi.mocked(db.update)
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([{ ...mockBooking1, status: 'no_show' }]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([{ ...mockBooking2, status: 'no_show' }]),
            }),
          }),
        } as any);

      const result = await processNoShows();

      expect(result.totalFound).toBe(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.totalFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully and continue processing', async () => {
      const { db } = await import('../db/index.js');

      const mockBooking1 = createMockBooking({ id: 'booking-1' });
      const mockBooking2 = createMockBooking({ id: 'booking-2' });

      // checkForNoShows returns 2 bookings
      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([mockBooking1, mockBooking2] as any);

      // First booking: success
      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(mockBooking1 as any);
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([{ ...mockBooking1, status: 'no_show' }]),
          }),
        }),
      } as any);

      // Second booking: error (not found)
      vi.mocked(db.query.bookings.findFirst).mockResolvedValueOnce(null as any);

      const result = await processNoShows();

      expect(result.totalFound).toBe(2);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].bookingId).toBe('booking-2');
    });

    it('should return zero results when no no-shows found', async () => {
      const { db } = await import('../db/index.js');

      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([] as any);

      const result = await processNoShows();

      expect(result.totalFound).toBe(0);
      expect(result.totalProcessed).toBe(0);
      expect(result.totalFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getNoShowStatistics', () => {
    it('should calculate no-show statistics for a provider', async () => {
      const { db } = await import('../db/index.js');

      const mockNoShowBookings = [
        createMockBooking({ status: 'no_show', feeCharged: 5000 }),
        createMockBooking({ status: 'no_show', feeCharged: 5000 }),
        createMockBooking({ status: 'no_show', feeCharged: 5000 }),
      ];

      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce(mockNoShowBookings as any);

      const result = await getNoShowStatistics('provider-123');

      expect(result.totalNoShows).toBe(3);
      expect(result.totalFeesCharged).toBe(15000); // 3 * 5000
      expect(result.averageFee).toBe(5000);
    });

    it('should return zero stats when no no-shows found', async () => {
      const { db } = await import('../db/index.js');

      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce([] as any);

      const result = await getNoShowStatistics('provider-123');

      expect(result.totalNoShows).toBe(0);
      expect(result.totalFeesCharged).toBe(0);
      expect(result.averageFee).toBe(0);
    });

    it('should handle bookings with null feeCharged', async () => {
      const { db } = await import('../db/index.js');

      const mockNoShowBookings = [
        createMockBooking({ status: 'no_show', feeCharged: 5000 }),
        createMockBooking({ status: 'no_show', feeCharged: null }),
      ];

      vi.mocked(db.query.bookings.findMany).mockResolvedValueOnce(mockNoShowBookings as any);

      const result = await getNoShowStatistics('provider-123');

      expect(result.totalNoShows).toBe(2);
      expect(result.totalFeesCharged).toBe(5000); // Only count non-null fees
      expect(result.averageFee).toBe(2500); // 5000 / 2
    });
  });
});
