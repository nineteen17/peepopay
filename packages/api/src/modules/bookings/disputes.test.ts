import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingsService } from './bookings.service.js';
import { db } from '../../db/index.js';
import { bookings } from '../../db/schema/index.js';
import { createQueueService } from '../../lib/queue.js';
import { createRefund } from '../../lib/stripe.js';
import { AppError } from '../../middleware/errorHandler.js';

// Mock dependencies
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      bookings: {
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

vi.mock('../../lib/queue.js', () => ({
  createQueueService: vi.fn(),
}));

vi.mock('../../lib/stripe.js', () => ({
  createRefund: vi.fn(),
}));

describe('Dispute Handling', () => {
  let bookingsService: BookingsService;
  let mockQueueService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingsService = new BookingsService();

    mockQueueService = {
      publishDisputeCreated: vi.fn(),
      publishDisputeResolved: vi.fn(),
    };

    vi.mocked(createQueueService).mockReturnValue(mockQueueService);
  });

  describe('createDispute', () => {
    it('should create a dispute for a cancelled booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'none',
        customerEmail: 'customer@test.com',
        customerName: 'Test Customer',
        bookingDate: new Date('2025-01-15'),
        service: {
          name: 'Test Service',
          user: {
            email: 'provider@test.com',
            name: 'Test Provider',
          },
        },
      };

      const mockUpdated = {
        ...mockBooking,
        disputeStatus: 'pending',
        disputeReason: 'Unfair cancellation fee',
        disputeCreatedAt: new Date(),
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      const result = await bookingsService.createDispute(
        'booking-1',
        'user-1',
        'Unfair cancellation fee'
      );

      expect(result.disputeStatus).toBe('pending');
      expect(result.disputeReason).toBe('Unfair cancellation fee');
      expect(mockQueueService.publishDisputeCreated).toHaveBeenCalledWith(
        'booking-1',
        'customer@test.com',
        'provider@test.com',
        expect.objectContaining({
          serviceName: 'Test Service',
          disputeReason: 'Unfair cancellation fee',
        })
      );
    });

    it('should create a dispute for a no-show booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'no_show',
        disputeStatus: 'none',
        customerEmail: 'customer@test.com',
        customerName: 'Test Customer',
        bookingDate: new Date('2025-01-15'),
        service: {
          name: 'Test Service',
          user: {
            email: 'provider@test.com',
            name: 'Test Provider',
          },
        },
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            { ...mockBooking, disputeStatus: 'pending' },
          ]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      const result = await bookingsService.createDispute(
        'booking-1',
        'user-1',
        'I was there on time'
      );

      expect(result.disputeStatus).toBe('pending');
    });

    it('should throw error if booking not found', async () => {
      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(null);

      await expect(
        bookingsService.createDispute('booking-1', 'user-1', 'Reason')
      ).rejects.toThrow(new AppError(404, 'Booking not found'));
    });

    it('should throw error if booking is not cancelled or no-show', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'confirmed',
        disputeStatus: 'none',
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      await expect(
        bookingsService.createDispute('booking-1', 'user-1', 'Reason')
      ).rejects.toThrow(
        new AppError(400, 'Only cancelled or no-show bookings can be disputed')
      );
    });

    it('should throw error if dispute already pending', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'pending',
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      await expect(
        bookingsService.createDispute('booking-1', 'user-1', 'Reason')
      ).rejects.toThrow(new AppError(400, 'This booking already has a pending dispute'));
    });

    it('should throw error if dispute already resolved', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'resolved_customer',
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      await expect(
        bookingsService.createDispute('booking-1', 'user-1', 'Reason')
      ).rejects.toThrow(
        new AppError(400, 'This booking dispute has already been resolved')
      );
    });

    it('should not fail if email sending fails', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'none',
        service: {
          name: 'Test Service',
          user: { email: 'provider@test.com', name: 'Provider' },
        },
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            { ...mockBooking, disputeStatus: 'pending' },
          ]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      mockQueueService.publishDisputeCreated.mockRejectedValue(new Error('Queue error'));

      // Should not throw
      const result = await bookingsService.createDispute('booking-1', 'user-1', 'Reason');
      expect(result.disputeStatus).toBe('pending');
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute in favor of customer with full refund', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'pending',
        depositAmount: 10000, // $100
        stripePaymentIntentId: 'pi_test123',
        customerEmail: 'customer@test.com',
        customerName: 'Test Customer',
        bookingDate: new Date('2025-01-15'),
        service: {
          name: 'Test Service',
          user: {
            email: 'provider@test.com',
            name: 'Test Provider',
          },
        },
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);
      vi.mocked(createRefund).mockResolvedValue({ id: 'refund_123' } as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              ...mockBooking,
              disputeStatus: 'resolved_customer',
              status: 'refunded',
              refundAmount: 10000,
            },
          ]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      const result = await bookingsService.resolveDispute(
        'booking-1',
        'admin-1',
        'customer',
        'Customer was right'
      );

      expect(result.disputeStatus).toBe('resolved_customer');
      expect(result.status).toBe('refunded');
      expect(createRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test123',
        amount: 10000,
        reason: 'dispute_resolution',
        metadata: expect.objectContaining({
          bookingId: 'booking-1',
          refundReason: 'dispute_resolved_customer',
          resolvedBy: 'admin-1',
        }),
      });
      expect(mockQueueService.publishDisputeResolved).toHaveBeenCalledWith(
        'booking-1',
        'customer@test.com',
        'provider@test.com',
        expect.objectContaining({
          resolution: 'customer',
          refundAmount: 10000,
        })
      );
    });

    it('should resolve dispute in favor of provider without refund', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'pending',
        depositAmount: 10000,
        stripePaymentIntentId: 'pi_test123',
        customerEmail: 'customer@test.com',
        customerName: 'Test Customer',
        bookingDate: new Date('2025-01-15'),
        service: {
          name: 'Test Service',
          user: {
            email: 'provider@test.com',
            name: 'Test Provider',
          },
        },
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            { ...mockBooking, disputeStatus: 'resolved_provider' },
          ]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      const result = await bookingsService.resolveDispute(
        'booking-1',
        'admin-1',
        'provider',
        'Provider was right'
      );

      expect(result.disputeStatus).toBe('resolved_provider');
      expect(createRefund).not.toHaveBeenCalled();
      expect(mockQueueService.publishDisputeResolved).toHaveBeenCalledWith(
        'booking-1',
        'customer@test.com',
        'provider@test.com',
        expect.objectContaining({
          resolution: 'provider',
          refundAmount: 0,
        })
      );
    });

    it('should throw error if booking not found', async () => {
      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(null);

      await expect(
        bookingsService.resolveDispute('booking-1', 'admin-1', 'customer', 'Notes')
      ).rejects.toThrow(new AppError(404, 'Booking not found'));
    });

    it('should throw error if no pending dispute', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'none',
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);

      await expect(
        bookingsService.resolveDispute('booking-1', 'admin-1', 'customer', 'Notes')
      ).rejects.toThrow(new AppError(400, 'No pending dispute found for this booking'));
    });

    it('should throw error if refund processing fails', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'pending',
        depositAmount: 10000,
        stripePaymentIntentId: 'pi_test123',
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);
      vi.mocked(createRefund).mockRejectedValue(new Error('Stripe error'));

      await expect(
        bookingsService.resolveDispute('booking-1', 'admin-1', 'customer', 'Notes')
      ).rejects.toThrow(new AppError(500, 'Failed to process refund for dispute resolution'));
    });

    it('should handle no-show dispute resolved in customer favor', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'no_show',
        disputeStatus: 'pending',
        depositAmount: 5000,
        stripePaymentIntentId: 'pi_test456',
        customerEmail: 'customer@test.com',
        customerName: 'Test Customer',
        bookingDate: new Date('2025-01-15'),
        service: {
          name: 'Test Service',
          user: {
            email: 'provider@test.com',
            name: 'Test Provider',
          },
        },
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);
      vi.mocked(createRefund).mockResolvedValue({ id: 'refund_456' } as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              ...mockBooking,
              disputeStatus: 'resolved_customer',
              status: 'refunded',
              refundAmount: 5000,
            },
          ]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      const result = await bookingsService.resolveDispute(
        'booking-1',
        'admin-1',
        'customer',
        'Customer provided proof of attendance'
      );

      expect(result.disputeStatus).toBe('resolved_customer');
      expect(result.status).toBe('refunded');
      expect(createRefund).toHaveBeenCalled();
    });

    it('should not fail if email sending fails', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        disputeStatus: 'pending',
        depositAmount: 10000,
        stripePaymentIntentId: 'pi_test123',
        service: {
          name: 'Test Service',
          user: { email: 'provider@test.com', name: 'Provider' },
        },
      };

      vi.mocked(db.query.bookings.findFirst).mockResolvedValue(mockBooking as any);
      vi.mocked(createRefund).mockResolvedValue({ id: 'refund_123' } as any);

      const mockUpdate = vi.mocked(db.update);
      const mockSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            { ...mockBooking, disputeStatus: 'resolved_customer' },
          ]),
        })),
      }));
      mockUpdate.mockReturnValue({ set: mockSet } as any);

      mockQueueService.publishDisputeResolved.mockRejectedValue(new Error('Queue error'));

      // Should not throw
      const result = await bookingsService.resolveDispute(
        'booking-1',
        'admin-1',
        'customer',
        'Notes'
      );
      expect(result.disputeStatus).toBe('resolved_customer');
    });
  });
});
