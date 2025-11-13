import { pgTable, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users.js';
import { bookings } from './bookings.js';

export const depositTypeEnum = ['percentage', 'fixed'] as const;

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

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

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const servicesRelations = relations(services, ({ one, many }) => ({
  user: one(users, {
    fields: [services.userId],
    references: [users.id],
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
