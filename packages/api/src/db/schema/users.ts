import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const industryVerticalEnum = ['general', 'trade', 'medical', 'legal', 'automotive', 'beauty', 'consulting'] as const;
export const verticalTierEnum = ['core', 'vertical', 'white_label'] as const;

// Better Auth - User table (merged with our custom fields)
export const user = pgTable('user', {
  // Better Auth required fields
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  name: text('name').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),

  // Our custom fields
  businessName: text('business_name'),
  slug: text('slug').unique(), // username/business-name for URL

  // Stripe Connect
  stripeAccountId: text('stripe_account_id').unique(),
  stripeOnboarded: boolean('stripe_onboarded').default(false),
  stripeFeePercentage: text('stripe_fee_percentage').default('2.5'), // Platform fee

  // Profile
  phone: text('phone'),
  avatar: text('avatar'),
  timezone: text('timezone').default('Australia/Sydney'),

  // Industry & Vertical
  industryVertical: text('industryVertical', { enum: industryVerticalEnum }).default('general'),
  industrySubcategory: text('industrySubcategory'),
  verticalTier: text('vertical_tier', { enum: verticalTierEnum }).default('core'),
  enabledFeatures: jsonb('enabled_features'),

  // Status
  isActive: boolean('is_active').default(true),
});

// Better Auth - Session table
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

// Better Auth - Account table
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  expiresAt: timestamp('expiresAt'),
  password: text('password'),
});

// Better Auth - Verification table
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
});

// Export for compatibility
export const users = user;
export const sessions = session;
export const accounts = account;
export const verifications = verification;

// Validation schemas
export const insertUserSchema = createInsertSchema(user).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(user);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type IndustryVertical = typeof industryVerticalEnum[number];
export type VerticalTier = typeof verticalTierEnum[number];
