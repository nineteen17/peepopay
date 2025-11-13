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
export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedSlotSchema = createInsertSchema(blockedSlots).omit({
  id: true,
  createdAt: true,
});

export type Availability = typeof availability.$inferSelect;
export type NewAvailability = typeof availability.$inferInsert;
export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type NewBlockedSlot = typeof blockedSlots.$inferInsert;
export type DayOfWeek = typeof dayOfWeekEnum[number];

/**
 * Convert JavaScript day of week (0-6) to our DayOfWeek enum
 * @param jsDay - JavaScript day (0 = Sunday, 6 = Saturday)
 * @returns DayOfWeek enum value
 */
export function getJSDayOfWeek(jsDay: number): DayOfWeek {
  const mapping: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return mapping[jsDay];
}

/**
 * Convert DayOfWeek enum to JavaScript day of week (0-6)
 * @param dayOfWeek - DayOfWeek enum value
 * @returns JavaScript day (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeekJS(dayOfWeek: DayOfWeek): number {
  const mapping: Record<DayOfWeek, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return mapping[dayOfWeek];
}
