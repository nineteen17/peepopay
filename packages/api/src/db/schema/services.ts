import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './users.js';
import { bookings } from './bookings.js';

export const depositTypeEnum = ['percentage', 'fixed'] as const;

export const services = pgTable('services', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

  // Service details
  name: text('name').notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // Duration in minutes

  // Pricing
  depositAmount: integer('deposit_amount').notNull(), // Amount in cents (or percentage if depositType is 'percentage')
  depositType: text('deposit_type', { enum: depositTypeEnum }).default('fixed').notNull(),
  depositPercentage: integer('deposit_percentage'), // Deprecated: use depositAmount with depositType='percentage'
  fullPrice: integer('full_price'), // Total service price in cents

  // Settings
  isActive: boolean('is_active').default(true),
  requiresApproval: boolean('requires_approval').default(false),

  // Refund Policy Settings
  cancellationWindowHours: integer('cancellation_window_hours').default(24), // Hours before booking to cancel for full refund
  lateCancellationFee: integer('late_cancellation_fee'), // Fee in cents for late cancellations
  noShowFee: integer('no_show_fee'), // Fee in cents for no-shows
  allowPartialRefunds: boolean('allow_partial_refunds').default(true), // Allow partial refunds based on timing
  autoRefundOnCancel: boolean('auto_refund_on_cancel').default(true), // Automatically process refunds
  minimumCancellationHours: integer('minimum_cancellation_hours').default(2), // Minimum hours before booking to cancel

  // Flex Pass (Cancellation Protection)
  flexPassEnabled: boolean('flex_pass_enabled').default(false), // Enable cancellation protection add-on
  flexPassPrice: integer('flex_pass_price'), // Price in cents for flex pass
  flexPassRevenueSharePercent: integer('flex_pass_revenue_share_percent').default(60), // Platform's share of flex pass fee (60-70%)
  flexPassRulesJson: jsonb('flex_pass_rules_json'), // Custom flex pass rules/conditions

  // Protection Addons
  protectionAddons: jsonb('protection_addons'), // Industry-specific protection addons (e.g., bad weather, sick day)

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const servicesRelations = relations(services, ({ one, many }) => ({
  user: one(user, {
    fields: [services.userId],
    references: [user.id],
  }),
  bookings: many(bookings),
}));

// Validation schemas
export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectServiceSchema = createSelectSchema(services);

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type DepositType = typeof depositTypeEnum[number];
