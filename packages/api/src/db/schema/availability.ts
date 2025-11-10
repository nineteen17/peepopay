import { pgTable, text, timestamp, uuid, time, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users.js';

export const dayOfWeekEnum = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const availability = pgTable('availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Day and time
  dayOfWeek: text('day_of_week', { enum: dayOfWeekEnum }).notNull(),
  startTime: time('start_time').notNull(), // Format: HH:MM
  endTime: time('end_time').notNull(), // Format: HH:MM

  // Break times (optional)
  breakStart: time('break_start'),
  breakEnd: time('break_end'),

  // Slot configuration
  slotDuration: integer('slot_duration').default(30), // Minutes per slot

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// For blocking specific dates/times
export const blockedSlots = pgTable('blocked_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Blocked time
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),

  // Reason
  reason: text('reason'),
  isRecurring: text('is_recurring').default('false'), // 'false', 'weekly', 'monthly'

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const availabilityRelations = relations(availability, ({ one }) => ({
  user: one(users, {
    fields: [availability.userId],
    references: [users.id],
  }),
}));

export const blockedSlotsRelations = relations(blockedSlots, ({ one }) => ({
  user: one(users, {
    fields: [blockedSlots.userId],
    references: [users.id],
  }),
}));

// Validation schemas
export const insertAvailabilitySchema = createInsertSchema(availability, {
  dayOfWeek: z.enum(dayOfWeekEnum),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  slotDuration: z.number().min(15).max(240).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedSlotSchema = createInsertSchema(blockedSlots, {
  startTime: z.date().or(z.string()),
  endTime: z.date().or(z.string()),
  reason: z.string().max(500).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type Availability = typeof availability.$inferSelect;
export type NewAvailability = z.infer<typeof insertAvailabilitySchema>;
export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type NewBlockedSlot = z.infer<typeof insertBlockedSlotSchema>;
export type DayOfWeek = typeof dayOfWeekEnum[number];
