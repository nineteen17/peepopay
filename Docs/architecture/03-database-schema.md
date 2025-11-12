# Database Schema

> ⚠️ **WARNING: This documentation is outdated and does not reflect the current schema implementation.**
>
> **For accurate schema information, please refer to:**
> - Source code: `packages/api/src/db/schema/`
> - Latest migration: `packages/api/drizzle/0001_implementation_plan_fixes.sql`
> - Run `npm run db:studio` in packages/api to view live schema
>
> **This file will be updated in a future PR.**

## Overview

PeepoPay uses PostgreSQL with Drizzle ORM for type-safe database access.

## Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
│  (Tradies)  │
├─────────────┤
│ id          │◄────┐
│ email       │     │
│ name        │     │
│ businessName│     │
│ slug        │     │  One-to-Many
│ stripeAcctId│     │
│ onboarded   │     │
└─────────────┘     │
                    │
       ┌────────────┼────────────┐
       │            │            │
       │            │            │
       ▼            ▼            ▼
┌───────────┐ ┌──────────┐ ┌─────────────┐
│ Services  │ │Availability│ │  Bookings   │
├───────────┤ ├──────────┤ ├─────────────┤
│ id        │ │ id       │ │ id          │
│ userId    │ │ userId   │ │ userId      │
│ name      │ │ dayOfWeek│ │ serviceId   │◄──┐
│ deposit   │ │ startTime│ │ customerName│   │
│ duration  │ │ endTime  │ │ bookingDate │   │
└───────────┘ │blockedDts│ │ depositAmt  │   │
              └──────────┘ │ status      │   │
                           └─────────────┘   │
                                             │
                                             │
                              One-to-Many    │
                                   Services have
                                   many Bookings
```

## Schema Definition (Drizzle ORM)

### Users Table

```typescript
// api/src/db/schema/users.ts
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  name: text('name'),
  image: text('image'),
  businessName: text('business_name'),
  slug: text('slug').unique(),
  phone: text('phone'),
  address: text('address'),
  
  // Stripe Connect
  stripeAccountId: text('stripe_account_id').unique(),
  stripeOnboarded: boolean('stripe_onboarded').default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### Services Table

```typescript
// api/src/db/schema/services.ts
import { pgTable, text, integer, decimal, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './users'

export const services = pgTable('services', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Service details
  name: text('name').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  
  // Deposit configuration
  depositType: text('deposit_type', { enum: ['percentage', 'fixed'] }).notNull().default('percentage'),
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }).notNull(),
  
  // Pricing (optional - for full amount display)
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  
  // Active status
  isActive: boolean('is_active').default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
```

### Availability Table

```typescript
// api/src/db/schema/availability.ts
import { pgTable, text, integer, time, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './users'

export const availability = pgTable('availability', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek: integer('day_of_week').notNull(),
  
  // Time range
  startTime: time('start_time').notNull(), // e.g., '09:00:00'
  endTime: time('end_time').notNull(),     // e.g., '17:00:00'
  
  // Blocked specific dates (array of ISO dates)
  blockedDates: jsonb('blocked_dates').$type<string[]>().default([]),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Availability = typeof availability.$inferSelect
export type NewAvailability = typeof availability.$inferInsert
```

### Bookings Table

```typescript
// api/src/db/schema/bookings.ts
import { pgTable, text, date, time, decimal, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './users'
import { services } from './services'

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  serviceId: text('service_id').references(() => services.id, { onDelete: 'restrict' }).notNull(),
  
  // Customer information
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull(),
  
  // Booking details
  bookingDate: date('booking_date').notNull(),
  bookingTime: time('booking_time').notNull(),
  
  // Payment information
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  depositStatus: text('deposit_status', { 
    enum: ['pending', 'paid', 'failed', 'refunded'] 
  }).notNull().default('pending'),
  
  // Stripe references
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripePaymentMethodId: text('stripe_payment_method_id'),
  
  // Booking status
  status: text('status', { 
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'] 
  }).notNull().default('pending'),
  
  // Notes
  customerNotes: text('customer_notes'),
  tradieNotes: text('tradie_notes'),
  
  // Refund information
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
  refundedAt: timestamp('refunded_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
```

### Better Auth Tables

```typescript
// api/src/db/schema/auth.ts
import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
})
```

## Database Indexes

```typescript
// api/src/db/schema/indexes.ts
import { index } from 'drizzle-orm/pg-core'
import { users, services, availability, bookings } from './schema'

// User indexes
export const emailIdx = index('email_idx').on(users.email)
export const slugIdx = index('slug_idx').on(users.slug)
export const stripeAccountIdx = index('stripe_account_idx').on(users.stripeAccountId)

// Service indexes
export const serviceUserIdx = index('service_user_idx').on(services.userId)
export const serviceActiveIdx = index('service_active_idx').on(services.isActive)

// Availability indexes
export const availabilityUserIdx = index('availability_user_idx').on(availability.userId)
export const availabilityDayIdx = index('availability_day_idx').on(availability.dayOfWeek)

// Booking indexes
export const bookingUserIdx = index('booking_user_idx').on(bookings.userId)
export const bookingDateIdx = index('booking_date_idx').on(bookings.bookingDate)
export const bookingStatusIdx = index('booking_status_idx').on(bookings.status)
export const bookingDepositStatusIdx = index('booking_deposit_status_idx').on(bookings.depositStatus)
```

## Migrations

### Initial Migration

```sql
-- migrations/0001_initial_schema.sql

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  name TEXT,
  image TEXT,
  business_name TEXT,
  slug TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  stripe_account_id TEXT UNIQUE,
  stripe_onboarded BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX email_idx ON users(email);
CREATE INDEX slug_idx ON users(slug);

-- Services table
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60 NOT NULL,
  deposit_type TEXT DEFAULT 'percentage' NOT NULL CHECK (deposit_type IN ('percentage', 'fixed')),
  deposit_amount DECIMAL(10, 2) NOT NULL,
  estimated_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX service_user_idx ON services(user_id);

-- Availability table
CREATE TABLE availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  blocked_dates JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX availability_user_idx ON availability(user_id);

-- Bookings table
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2),
  deposit_status TEXT DEFAULT 'pending' NOT NULL CHECK (deposit_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  customer_notes TEXT,
  tradie_notes TEXT,
  refund_amount DECIMAL(10, 2),
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

CREATE INDEX booking_user_idx ON bookings(user_id);
CREATE INDEX booking_date_idx ON bookings(booking_date);
CREATE INDEX booking_status_idx ON bookings(status);

-- Better Auth tables
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

## Common Queries

### Get Tradie with Services

```typescript
// api/src/services/tradieService.ts
import { db } from '../db'
import { users, services } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getTradieBySlug(slug: string) {
  return await db.query.users.findFirst({
    where: eq(users.slug, slug),
    with: {
      services: {
        where: eq(services.isActive, true),
        orderBy: (services, { asc }) => [asc(services.name)],
      },
    },
  })
}
```

### Get Available Slots

```typescript
export async function getAvailableSlots(userId: string, date: string) {
  // Get availability rules
  const dayOfWeek = new Date(date).getDay()
  
  const rules = await db.query.availability.findMany({
    where: eq(availability.userId, userId),
  })
  
  // Get existing bookings for that date
  const existingBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.userId, userId),
      eq(bookings.bookingDate, date),
      ne(bookings.status, 'cancelled')
    ),
  })
  
  // Calculate available slots (implementation details...)
  return calculateSlots(rules, existingBookings)
}
```

### Create Booking

```typescript
export async function createBooking(data: NewBooking) {
  return await db.insert(bookings).values(data).returning()
}
```

## Data Validation

```typescript
// api/src/validators/booking.ts
import { z } from 'zod'

export const createBookingSchema = z.object({
  serviceId: z.string().cuid2(),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  customerAddress: z.string().min(10),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  customerNotes: z.string().max(500).optional(),
})
```

## Next Steps

- [Payment Flows →](./04-payment-flows.md)
- [API Routes →](../api/routes.md)
