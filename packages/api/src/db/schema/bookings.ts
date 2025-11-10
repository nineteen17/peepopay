import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users.js';
import { services } from './services.js';

export const bookingStatusEnum = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'] as const;

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),

  // Customer details
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),

  // Booking details
  bookingDate: timestamp('booking_date').notNull(),
  duration: integer('duration').notNull(), // Duration in minutes
  notes: text('notes'),

  // Payment
  depositAmount: integer('deposit_amount').notNull(), // Amount in cents
  status: text('status', { enum: bookingStatusEnum }).default('pending').notNull(),

  // Stripe
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeChargeId: text('stripe_charge_id'),

  // Metadata
  metadata: jsonb('metadata'), // For storing additional custom data

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
}));

// Validation schemas
export const insertBookingSchema = createInsertSchema(bookings, {
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  bookingDate: z.date().or(z.string()),
  duration: z.number().min(15).max(480),
  notes: z.string().max(1000).optional(),
  depositAmount: z.number().min(100),
  status: z.enum(bookingStatusEnum).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectBookingSchema = createSelectSchema(bookings);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = z.infer<typeof insertBookingSchema>;
export type BookingStatus = typeof bookingStatusEnum[number];
