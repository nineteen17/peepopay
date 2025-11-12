/**
 * 🚨 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * This file contains TypeScript types synchronized from the API.
 * Any manual changes will be overwritten on the next sync.
 *
 * Source: packages/api/src/db/schema/
 * Generated: 2025-11-12T07:35:00.000Z
 *
 * To update this file, run from packages/api:
 *   npm run sync-types
 *
 * Source of truth: packages/api/src/db/schema/
 */

// ==================== Enums ====================

/**
 * Deposit type for services
 */
export type DepositType = 'percentage' | 'fixed';

/**
 * Booking status
 */
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

/**
 * Deposit payment status
 */
export type DepositStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// ==================== Services ====================

/**
 * Service entity (complete)
 */
export interface Service {
  id: string;
  userId: string;

  // Service details
  name: string;
  description: string | null;
  duration: number; // Duration in minutes

  // Pricing
  depositAmount: number; // Amount in cents (or percentage if depositType is 'percentage')
  depositType: DepositType;
  depositPercentage: number | null; // Deprecated: use depositAmount with depositType='percentage'
  fullPrice: number | null; // Total service price in cents

  // Settings
  isActive: boolean | null;
  requiresApproval: boolean | null;

  // Timestamps
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Service creation/update payload
 */
export interface NewService {
  userId: string;
  name: string;
  description?: string;
  duration: number; // 15 minutes to 8 hours (480)
  depositAmount: number; // Minimum 100 cents ($1.00) or 1% depending on depositType
  depositType?: DepositType;
  depositPercentage?: number; // 1-100
  fullPrice?: number; // Minimum 100 cents
  isActive?: boolean;
  requiresApproval?: boolean;
}

// ==================== Bookings ====================

/**
 * Booking entity (complete)
 */
export interface Booking {
  id: string;
  userId: string;
  serviceId: string;

  // Customer details
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string | null;

  // Booking details
  bookingDate: string; // ISO 8601 timestamp
  duration: number; // Duration in minutes
  notes: string | null;

  // Payment
  depositAmount: number; // Amount in cents
  depositStatus: DepositStatus;
  status: BookingStatus;

  // Stripe
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;

  // Metadata
  metadata: Record<string, any> | null; // For storing additional custom data

  // Timestamps
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Booking creation payload
 */
export interface NewBooking {
  userId: string;
  serviceId: string;
  customerName: string; // Min 2, max 100 characters
  customerEmail: string; // Valid email format
  customerPhone: string; // Min 10, max 20 characters
  customerAddress?: string; // Max 500 characters
  bookingDate: Date | string; // ISO 8601
  duration: number; // 15 minutes to 8 hours (480)
  notes?: string; // Max 1000 characters
  depositAmount: number; // Minimum 100 cents
  depositStatus?: DepositStatus;
  status?: BookingStatus;
}

// ==================== Users ====================

/**
 * User entity (complete)
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  businessName: string | null;
  slug: string | null; // Unique URL-friendly identifier
  image: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ==================== API Responses ====================

/**
 * Response from GET /api/services/user/:slug
 */
export interface ServiceListResponse {
  services: Service[];
}

/**
 * Response from GET /api/services/:id
 */
export interface ServiceResponse {
  service: Service;
}

/**
 * Response from POST /api/bookings
 */
export interface CreateBookingResponse {
  booking: Booking;
  clientSecret: string; // Stripe Payment Intent client secret
}

/**
 * Response from GET /api/bookings
 */
export interface BookingListResponse {
  bookings: Booking[];
}

/**
 * Response from GET /api/bookings/:id
 */
export interface BookingResponse {
  booking: Booking;
}

/**
 * Health check response from GET /health
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      responseTime: number;
    };
    redis: {
      status: 'up' | 'down';
      responseTime: number;
    };
    rabbitmq: {
      status: 'up' | 'down';
      responseTime: number;
    };
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message?: string;
}

// ==================== Helper Types ====================

/**
 * Utility type for API request/response validation
 */
export type ApiEndpoint = {
  // Services
  'GET /api/services': {
    response: ServiceListResponse;
  };
  'GET /api/services/user/:slug': {
    params: { slug: string };
    response: ServiceListResponse;
  };
  'GET /api/services/:id': {
    params: { id: string };
    response: ServiceResponse;
  };
  'POST /api/services': {
    body: NewService;
    response: ServiceResponse;
  };
  'PUT /api/services/:id': {
    params: { id: string };
    body: Partial<NewService>;
    response: ServiceResponse;
  };
  'DELETE /api/services/:id': {
    params: { id: string };
    response: { success: boolean };
  };

  // Bookings
  'GET /api/bookings': {
    response: BookingListResponse;
  };
  'GET /api/bookings/:id': {
    params: { id: string };
    response: BookingResponse;
  };
  'POST /api/bookings': {
    body: NewBooking;
    response: CreateBookingResponse;
  };
  'PUT /api/bookings/:id/status': {
    params: { id: string };
    body: { status: BookingStatus };
    response: BookingResponse;
  };
  'DELETE /api/bookings/:id': {
    params: { id: string };
    response: { success: boolean };
  };

  // Health
  'GET /health': {
    response: HealthResponse;
  };
};
