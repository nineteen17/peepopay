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
export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  depositAmount: z.number().min(100), // Minimum $1.00 or 1% depending on depositType
  depositType: z.enum(depositTypeEnum).optional(),
  depositPercentage: z.number().min(1).max(100).optional(),
  fullPrice: z.number().min(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectServiceSchema = createSelectSchema(services);

export type Service = typeof services.$inferSelect;
export type NewService = z.infer<typeof insertServiceSchema>;
export type DepositType = typeof depositTypeEnum[number];
