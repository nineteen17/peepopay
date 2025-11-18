import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './users.js';
import { services } from './services.js';

export const bookingStatusEnum = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'no_show'] as const;
export const depositStatusEnum = ['pending', 'paid', 'failed', 'refunded'] as const;
export const disputeStatusEnum = ['none', 'pending', 'resolved_customer', 'resolved_provider'] as const;

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),

  // Customer details
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address'),

  // Booking details
  bookingDate: timestamp('booking_date').notNull(),
  duration: integer('duration').notNull(), // Duration in minutes
  notes: text('notes'),

  // Payment
  depositAmount: integer('deposit_amount').notNull(), // Amount in cents
  depositStatus: text('deposit_status', { enum: depositStatusEnum }).default('pending').notNull(),
  status: text('status', { enum: bookingStatusEnum }).default('pending').notNull(),

  // Stripe
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeChargeId: text('stripe_charge_id'),

  // Cancellation & Refund Tracking
  cancellationTime: timestamp('cancellation_time'), // When booking was cancelled
  cancellationReason: text('cancellation_reason'), // Why booking was cancelled
  refundAmount: integer('refund_amount'), // Refund amount in cents
  refundReason: text('refund_reason'), // Reason for refund calculation
  feeCharged: integer('fee_charged'), // Any fees charged (late cancellation, no-show) in cents

  // Flex Pass (Cancellation Protection)
  flexPassPurchased: boolean('flex_pass_purchased').default(false), // Whether customer purchased flex pass
  flexPassFee: integer('flex_pass_fee'), // Flex pass fee paid in cents

  // Policy Snapshot (Critical: Stores policy at time of booking)
  policySnapshotJson: jsonb('policy_snapshot_json'), // Snapshot of service policy at booking time (nullable for existing bookings)

  // Dispute Handling
  disputeStatus: text('dispute_status', { enum: disputeStatusEnum }).default('none').notNull(), // Dispute status
  disputeReason: text('dispute_reason'), // Customer's dispute reason
  disputeCreatedAt: timestamp('dispute_created_at'), // When dispute was created
  disputeResolvedAt: timestamp('dispute_resolved_at'), // When dispute was resolved

  // Vertical-Specific Data
  verticalData: jsonb('vertical_data'), // Industry-specific data (e.g., medical: patient notes, legal: case number)

  // Metadata
  metadata: jsonb('metadata'), // For storing additional custom data

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(user, {
    fields: [bookings.userId],
    references: [user.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
}));

// Validation schemas
export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectBookingSchema = createSelectSchema(bookings);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = typeof bookingStatusEnum[number];
export type DepositStatus = typeof depositStatusEnum[number];
export type DisputeStatus = typeof disputeStatusEnum[number];
