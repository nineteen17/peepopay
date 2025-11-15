import { describe, it, expect } from 'vitest';
import {
  createPolicySnapshot,
  getPolicyFromSnapshot,
  validatePolicySnapshot,
  hasValidPolicySnapshot,
  getPolicySummary,
  type PolicySnapshot,
} from './policySnapshot.js';
import type { Service } from '../db/schema/services.js';
import type { Booking } from '../db/schema/bookings.js';

describe('Policy Snapshot Module', () => {
  // Mock service data
  const mockService: Partial<Service> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Plumbing Service',
    depositAmount: 5000, // $50.00
    depositType: 'fixed',
    fullPrice: 15000, // $150.00
    cancellationWindowHours: 24,
    minimumCancellationHours: 2,
    lateCancellationFee: 3000, // $30.00
    noShowFee: 5000, // $50.00
    allowPartialRefunds: true,
    autoRefundOnCancel: true,
    flexPassEnabled: true,
    flexPassPrice: 500, // $5.00
    flexPassRevenueSharePercent: 60,
    flexPassRulesJson: { allowAnytime: true },
    protectionAddons: [
      {
        id: 'bad-weather',
        name: 'Bad Weather Protection',
        price: 1000,
        rules: { weatherCondition: 'severe' },
      },
    ],
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  describe('createPolicySnapshot', () => {
    it('should create a valid policy snapshot from a service', () => {
      const snapshot = createPolicySnapshot(mockService as Service);

      expect(snapshot).toBeDefined();
      expect(snapshot.serviceId).toBe(mockService.id);
      expect(snapshot.serviceName).toBe(mockService.name);
      expect(snapshot.depositAmount).toBe(5000);
      expect(snapshot.depositType).toBe('fixed');
      expect(snapshot.cancellationWindowHours).toBe(24);
      expect(snapshot.lateCancellationFee).toBe(3000);
      expect(snapshot.noShowFee).toBe(5000);
      expect(snapshot.flexPassEnabled).toBe(true);
      expect(snapshot.flexPassPrice).toBe(500);
      expect(snapshot.protectionAddons).toHaveLength(1);
    });

    it('should use default values for missing policy fields', () => {
      const minimalService: Partial<Service> = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Minimal Service',
        depositAmount: 1000,
        depositType: 'fixed',
        fullPrice: null,
        updatedAt: new Date('2024-01-15T10:00:00Z'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      const snapshot = createPolicySnapshot(minimalService as Service);

      expect(snapshot.cancellationWindowHours).toBe(24); // Default
      expect(snapshot.minimumCancellationHours).toBe(2); // Default
      expect(snapshot.allowPartialRefunds).toBe(true); // Default
      expect(snapshot.autoRefundOnCancel).toBe(true); // Default
      expect(snapshot.flexPassEnabled).toBe(false); // Default
      expect(snapshot.flexPassRevenueSharePercent).toBe(60); // Default
    });

    it('should handle null protection addons', () => {
      const serviceWithoutAddons: Partial<Service> = {
        ...mockService,
        protectionAddons: null,
      };

      const snapshot = createPolicySnapshot(serviceWithoutAddons as Service);

      expect(snapshot.protectionAddons).toBeNull();
    });

    it('should include snapshot creation timestamp', () => {
      const beforeSnapshot = new Date();
      const snapshot = createPolicySnapshot(mockService as Service);
      const afterSnapshot = new Date();

      expect(snapshot.snapshotCreatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeSnapshot.getTime()
      );
      expect(snapshot.snapshotCreatedAt.getTime()).toBeLessThanOrEqual(
        afterSnapshot.getTime()
      );
    });

    it('should preserve service version (updatedAt)', () => {
      const snapshot = createPolicySnapshot(mockService as Service);

      expect(snapshot.serviceVersion).toEqual(mockService.updatedAt);
    });
  });

  describe('getPolicyFromSnapshot', () => {
    it('should retrieve policy snapshot from booking', () => {
      const snapshot = createPolicySnapshot(mockService as Service);

      const mockBooking: Partial<Booking> = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        policySnapshotJson: snapshot as any,
      };

      const retrievedPolicy = getPolicyFromSnapshot(mockBooking as Booking);

      expect(retrievedPolicy).toBeDefined();
      expect(retrievedPolicy?.serviceId).toBe(mockService.id);
      expect(retrievedPolicy?.cancellationWindowHours).toBe(24);
      expect(retrievedPolicy?.flexPassEnabled).toBe(true);
    });

    it('should return null if booking has no snapshot', () => {
      const mockBooking: Partial<Booking> = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        policySnapshotJson: null,
      };

      const retrievedPolicy = getPolicyFromSnapshot(mockBooking as Booking);

      expect(retrievedPolicy).toBeNull();
    });

    it('should throw error for invalid snapshot data', () => {
      const mockBooking: Partial<Booking> = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        policySnapshotJson: { invalid: 'data' } as any,
      };

      expect(() => getPolicyFromSnapshot(mockBooking as Booking)).toThrow(
        'Invalid policy snapshot in booking'
      );
    });
  });

  describe('validatePolicySnapshot', () => {
    it('should validate a correct policy snapshot', () => {
      const snapshot = createPolicySnapshot(mockService as Service);

      expect(validatePolicySnapshot(snapshot)).toBe(true);
    });

    it('should reject invalid snapshot with missing required fields', () => {
      const invalidSnapshot = {
        serviceId: '123',
        // Missing other required fields
      };

      expect(validatePolicySnapshot(invalidSnapshot)).toBe(false);
    });

    it('should reject snapshot with invalid data types', () => {
      const invalidSnapshot = {
        serviceId: '550e8400-e29b-41d4-a716-446655440000',
        serviceName: 'Test',
        serviceVersion: 'not-a-date', // Should be a date
        snapshotCreatedAt: new Date(),
        depositAmount: 'not-a-number', // Should be a number
        depositType: 'fixed',
        fullPrice: null,
        cancellationWindowHours: 24,
        minimumCancellationHours: 2,
        lateCancellationFee: null,
        noShowFee: null,
        allowPartialRefunds: true,
        autoRefundOnCancel: true,
        flexPassEnabled: false,
        flexPassPrice: null,
        flexPassRevenueSharePercent: 60,
        flexPassRulesJson: null,
        protectionAddons: null,
      };

      expect(validatePolicySnapshot(invalidSnapshot)).toBe(false);
    });

    it('should reject negative fee amounts', () => {
      const snapshot = createPolicySnapshot(mockService as Service);
      (snapshot as any).lateCancellationFee = -1000; // Negative fee

      expect(validatePolicySnapshot(snapshot)).toBe(false);
    });
  });

  describe('hasValidPolicySnapshot', () => {
    it('should return true for booking with valid snapshot', () => {
      const snapshot = createPolicySnapshot(mockService as Service);

      const mockBooking: Partial<Booking> = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        policySnapshotJson: snapshot as any,
      };

      expect(hasValidPolicySnapshot(mockBooking as Booking)).toBe(true);
    });

    it('should return false for booking without snapshot', () => {
      const mockBooking: Partial<Booking> = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        policySnapshotJson: null,
      };

      expect(hasValidPolicySnapshot(mockBooking as Booking)).toBe(false);
    });

    it('should return false for booking with invalid snapshot', () => {
      const mockBooking: Partial<Booking> = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        policySnapshotJson: { invalid: 'data' } as any,
      };

      expect(hasValidPolicySnapshot(mockBooking as Booking)).toBe(false);
    });
  });

  describe('getPolicySummary', () => {
    it('should generate human-readable summary of policy', () => {
      const snapshot = createPolicySnapshot(mockService as Service);
      const summary = getPolicySummary(snapshot);

      expect(summary).toContain('Cancel within 24 hours for full refund');
      expect(summary).toContain('Late cancellation fee: $30.00');
      expect(summary).toContain('No-show fee: $50.00');
      expect(summary).toContain('Cancellation protection available for $5.00');
    });

    it('should omit fees not configured', () => {
      const serviceWithoutFees: Partial<Service> = {
        ...mockService,
        lateCancellationFee: null,
        noShowFee: null,
        flexPassEnabled: false,
      };

      const snapshot = createPolicySnapshot(serviceWithoutFees as Service);
      const summary = getPolicySummary(snapshot);

      expect(summary).toContain('Cancel within 24 hours for full refund');
      expect(summary).not.toContain('Late cancellation fee');
      expect(summary).not.toContain('No-show fee');
      expect(summary).not.toContain('Cancellation protection');
    });
  });

  describe('Policy Snapshot Immutability', () => {
    it('should preserve original policy even if service changes', () => {
      // Create initial snapshot
      const snapshot1 = createPolicySnapshot(mockService as Service);

      // Simulate service policy change
      const updatedService = {
        ...mockService,
        cancellationWindowHours: 48, // Changed from 24 to 48
        lateCancellationFee: 5000, // Changed from 3000 to 5000
        updatedAt: new Date('2024-02-01T10:00:00Z'),
      };

      const snapshot2 = createPolicySnapshot(updatedService as Service);

      // Original snapshot should remain unchanged
      expect(snapshot1.cancellationWindowHours).toBe(24);
      expect(snapshot1.lateCancellationFee).toBe(3000);
      expect(snapshot1.serviceVersion).toEqual(mockService.updatedAt);

      // New snapshot should reflect changes
      expect(snapshot2.cancellationWindowHours).toBe(48);
      expect(snapshot2.lateCancellationFee).toBe(5000);
      expect(snapshot2.serviceVersion).toEqual(updatedService.updatedAt);
    });
  });

  describe('Edge Cases', () => {
    it('should handle percentage-based deposits', () => {
      const percentageService: Partial<Service> = {
        ...mockService,
        depositType: 'percentage',
        depositAmount: 25, // 25% deposit
      };

      const snapshot = createPolicySnapshot(percentageService as Service);

      expect(snapshot.depositType).toBe('percentage');
      expect(snapshot.depositAmount).toBe(25);
    });

    it('should handle services without full price', () => {
      const serviceWithoutFullPrice: Partial<Service> = {
        ...mockService,
        fullPrice: null,
      };

      const snapshot = createPolicySnapshot(serviceWithoutFullPrice as Service);

      expect(snapshot.fullPrice).toBeNull();
    });

    it('should handle complex protection addons', () => {
      const serviceWithComplexAddons: Partial<Service> = {
        ...mockService,
        protectionAddons: [
          {
            id: 'weather',
            name: 'Weather Protection',
            price: 1000,
            rules: {
              conditions: ['rain', 'snow', 'storm'],
              minimumSeverity: 'moderate',
              requiresPhotos: true,
            },
          },
          {
            id: 'parts-delay',
            name: 'Parts Delay Protection',
            price: 800,
            rules: {
              maxDelayDays: 7,
              requiresSupplierConfirmation: true,
            },
          },
        ],
      };

      const snapshot = createPolicySnapshot(serviceWithComplexAddons as Service);

      expect(snapshot.protectionAddons).toHaveLength(2);
      expect(snapshot.protectionAddons![0].rules).toHaveProperty('conditions');
      expect(snapshot.protectionAddons![1].rules).toHaveProperty('maxDelayDays');
    });
  });
});
