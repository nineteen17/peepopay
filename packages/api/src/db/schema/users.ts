import { pgTable, text, timestamp, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const industryVerticalEnum = ['general', 'trade', 'medical', 'legal', 'automotive', 'beauty', 'consulting'] as const;
export const verticalTierEnum = ['core', 'vertical', 'white_label'] as const;

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name').notNull(),
  businessName: text('business_name'),
  slug: text('slug').notNull().unique(), // username/business-name for URL

  // Stripe Connect
  stripeAccountId: text('stripe_account_id').unique(),
  stripeOnboarded: boolean('stripe_onboarded').default(false),
  stripeFeePercentage: text('stripe_fee_percentage').default('2.5'), // Platform fee

  // Auth
  passwordHash: text('password_hash'),

  // Profile
  phone: text('phone'),
  avatar: text('avatar'),
  timezone: text('timezone').default('Australia/Sydney'),

  // Industry & Vertical
  industryVertical: text('industry_vertical', { enum: industryVerticalEnum }).default('general'), // Business industry type
  industrySubcategory: text('industry_subcategory'), // Specific subcategory (e.g., 'plumber', 'dentist', 'lawyer')
  verticalTier: text('vertical_tier', { enum: verticalTierEnum }).default('core'), // Pricing tier based on features
  enabledFeatures: jsonb('enabled_features'), // Feature flags for vertical-specific functionality

  // Status
  isActive: boolean('is_active').default(true),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Validation schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type IndustryVertical = typeof industryVerticalEnum[number];
export type VerticalTier = typeof verticalTierEnum[number];
