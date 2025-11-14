# Database Schema

> 💡 **Source of Truth**: This documentation is generated from the actual schema files in `packages/api/src/db/schema/`
>
> **Last Updated**: 2025-11-12 (Implementation Plan migration applied)

## Overview

PeepoPay uses **PostgreSQL 16** with **Drizzle ORM** for type-safe database access. All schemas use **Zod** for validation and automatic OpenAPI generation.

## Core Principles

- **UUID Primary Keys**: All tables use UUID for distributed-friendly IDs
- **Timestamps**: All tables have `createdAt` and `updatedAt`
- **Soft Deletes**: Use `isActive` flags instead of hard deletes where appropriate
- **Zod Validation**: All schemas have auto-generated Zod validators
- **Type Safety**: TypeScript types inferred directly from schema definitions

## Entity Relationship Diagram

```
┌─────────────────────┐
│       Users         │
│    (Providers)      │
├─────────────────────┤
│ id (UUID)           │◄────────┐
│ email               │         │
│ name                │         │
│ businessName        │         │
│ slug (unique)       │         │
│ stripeAccountId     │         │
│ timezone            │         │
└─────────────────────┘         │
         │                      │
         │ One-to-Many          │
         ├──────────────┬───────┴──────┬─────────────┐
         │              │              │             │
         ▼              ▼              ▼             ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│  Services    │ │Availability │ │BlockedSlots  │ │  Bookings    │
├──────────────┤ ├─────────────┤ ├──────────────┤ ├──────────────┤
│ id           │ │ id          │ │ id           │ │ id           │
│ userId       │ │ userId      │ │ userId       │ │ userId       │
│ name         │ │ dayOfWeek   │ │ startTime    │ │ serviceId    │◄──┐
│ depositType  │ │ startTime   │ │ endTime      │ │ customerName │   │
│ depositAmount│ │ endTime     │ │ reason       │ │ bookingDate  │   │
│ duration     │ │ breakStart  │ │ isRecurring  │ │ depositStatus│   │
│ isActive     │ │ breakEnd    │ └──────────────┘ │ status       │   │
└──────────────┘ └─────────────┘                  └──────────────┘   │
                                                          │           │
                                                          └───────────┘
                                                        One-to-Many
```

## Tables

### 1. Users

**Purpose**: Store provider account information and Stripe Connect details

**File**: `packages/api/src/db/schema/users.ts`

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identity
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name').notNull(),
  businessName: text('business_name'),
  slug: text('slug').notNull().unique(), // URL-friendly username

  // Stripe Connect
  stripeAccountId: text('stripe_account_id').unique(),
  stripeOnboarded: boolean('stripe_onboarded').default(false),
  stripeFeePercentage: text('stripe_fee_percentage').default('2.5'),

  // Auth
  passwordHash: text('password_hash'),

  // Profile
  phone: text('phone'),
  avatar: text('avatar'),
  timezone: text('timezone').default('Australia/Sydney'),

  // Status
  isActive: boolean('is_active').default(true),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Indexes**:
- `email` (unique)
- `slug` (unique)
- `stripeAccountId` (unique)

---

### 2. Services

**Purpose**: Store service offerings by providers

**File**: `packages/api/src/db/schema/services.ts`

```typescript
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Service details
  name: text('name').notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // Minutes

  // Pricing - NEW: depositType field added
  depositAmount: integer('deposit_amount').notNull(), // Cents (or % if depositType='percentage')
  depositType: text('deposit_type', { enum: ['percentage', 'fixed'] })
    .default('fixed')
    .notNull(),
  depositPercentage: integer('deposit_percentage'), // Deprecated
  fullPrice: integer('full_price'), // Cents

  // Settings
  isActive: boolean('is_active').default(true),
  requiresApproval: boolean('requires_approval').default(false),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Indexes**:
- `userId`
- `isActive`

**Notes**:
- All amounts stored in **cents** for precision
- `depositType='percentage'`: `depositAmount` is percentage (e.g., 25 = 25%)
- `depositType='fixed'`: `depositAmount` is amount in cents
- `depositPercentage` deprecated in favor of `depositType` system

---

### 3. Bookings

**Purpose**: Store customer bookings and payment tracking

**File**: `packages/api/src/db/schema/bookings.ts`

```typescript
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),

  // Customer details - NEW: customerAddress added, customerPhone now required
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(), // Was optional, now required
  customerAddress: text('customer_address'), // NEW: optional field

  // Booking details
  bookingDate: timestamp('booking_date').notNull(), // Stored in UTC
  duration: integer('duration').notNull(), // Minutes
  notes: text('notes'),

  // Payment - NEW: depositStatus field added
  depositAmount: integer('deposit_amount').notNull(), // Cents
  depositStatus: text('deposit_status', {
    enum: ['pending', 'paid', 'failed', 'refunded']
  }).default('pending').notNull(), // NEW: separate payment status
  status: text('status', {
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded']
  }).default('pending').notNull(),

  // Stripe
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeChargeId: text('stripe_charge_id'),

  // Metadata
  metadata: jsonb('metadata'), // Flexible JSON data

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Indexes** (NEW - Added in migration):
- `userId`
- `bookingDate`
- `status`
- `stripePaymentIntentId`

**Status Flow**:
```
pending → confirmed → completed
   ↓          ↓
cancelled  cancelled
   ↓
refunded
```

**Deposit Status Flow**:
```
pending → paid
   ↓        ↓
failed  refunded
```

**Notes**:
- `userId` = provider (service owner), NOT customer
- `bookingDate` stored in UTC, convert using user's timezone
- `depositStatus` tracks payment, `status` tracks booking lifecycle

---

### 4. Availability

**Purpose**: Define provider availability rules by day of week

**File**: `packages/api/src/db/schema/availability.ts`

```typescript
export const availability = pgTable('availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Day and time
  dayOfWeek: text('day_of_week', {
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }).notNull(),
  startTime: time('start_time').notNull(), // HH:MM format
  endTime: time('end_time').notNull(),

  // Break times (optional)
  breakStart: time('break_start'),
  breakEnd: time('break_end'),

  // Slot configuration
  slotDuration: integer('slot_duration').default(30), // Minutes per slot

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Indexes** (NEW - Added in migration):
- `userId` + `dayOfWeek` (composite)

**Helper Functions**:
```typescript
// Convert JS day (0-6) to enum
export function getJSDayOfWeek(jsDay: number): DayOfWeek;

// Convert enum to JS day (0-6)
export function getDayOfWeekJS(dayOfWeek: DayOfWeek): number;
```

---

### 5. Blocked Slots

**Purpose**: Block specific dates/times (holidays, personal time, etc.)

**File**: `packages/api/src/db/schema/availability.ts`

```typescript
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
```

**Indexes** (NEW - Added in migration):
- `userId` + `startTime` + `endTime` (composite)

---

## Relations

```typescript
// Services belong to User
export const servicesRelations = relations(services, ({ one, many }) => ({
  user: one(users, {
    fields: [services.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

// Bookings belong to User and Service
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

// Availability belongs to User
export const availabilityRelations = relations(availability, ({ one }) => ({
  user: one(users, {
    fields: [availability.userId],
    references: [users.id],
  }),
}));

// Blocked Slots belong to User
export const blockedSlotsRelations = relations(blockedSlots, ({ one }) => ({
  user: one(users, {
    fields: [blockedSlots.userId],
    references: [users.id],
  }),
}));
```

---

## Common Queries

### Get Provider with Active Services

```typescript
const provider = await db.query.users.findFirst({
  where: eq(users.slug, 'john-plumber'),
  with: {
    services: {
      where: eq(services.isActive, true),
      orderBy: (services, { asc }) => [asc(services.name)],
    },
  },
});
```

### Get Availability for Specific Day

```typescript
const rules = await db.query.availability.findMany({
  where: and(
    eq(availability.userId, userId),
    eq(availability.dayOfWeek, 'monday')
  ),
});
```

### Get Bookings with Filters

```typescript
const bookings = await db.query.bookings.findMany({
  where: and(
    eq(bookings.userId, userId),
    eq(bookings.status, 'confirmed'),
    gte(bookings.bookingDate, startDate),
    lte(bookings.bookingDate, endDate)
  ),
  with: {
    service: true,
  },
  orderBy: (bookings, { desc }) => [desc(bookings.bookingDate)],
});
```

### Check Booking Conflicts

```typescript
const conflicts = await db.query.bookings.findMany({
  where: and(
    eq(bookings.userId, userId),
    or(
      eq(bookings.status, 'confirmed'),
      eq(bookings.status, 'pending')
    ),
    lt(bookings.bookingDate, endTime)
  ),
  with: {
    service: true,
  },
});

// Then check for time overlaps in application logic
```

---

## Validation Schemas

All tables have auto-generated Zod schemas:

```typescript
// Auto-generated from schema
export const insertBookingSchema = createInsertSchema(bookings, {
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  customerAddress: z.string().max(500).optional(),
  bookingDate: z.date().or(z.string()),
  duration: z.number().min(15).max(480),
  notes: z.string().max(1000).optional(),
  depositAmount: z.number().min(100),
  depositStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'refunded']).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
```

---

## Migrations

### Latest Migration

**File**: `packages/api/drizzle/0001_implementation_plan_fixes.sql`

**Changes**:
- ✅ Added `depositType` to services table
- ✅ Added `depositStatus` to bookings table
- ✅ Made `customerPhone` required
- ✅ Added optional `customerAddress` to bookings
- ✅ Created 8 performance indexes

### Running Migrations

```bash
# Local development
cd packages/api
npm run db:migrate

# Docker Compose
docker-compose run --rm migrate

# Docker Swarm
docker service create --name peepopay-migrate \
  --network peepopay-network \
  --env DATABASE_URL="..." \
  --restart-condition none \
  peepopay-api:latest npm run db:migrate
```

See [MIGRATIONS_DOCKER.md](../../MIGRATIONS_DOCKER.md) for complete guide.

---

## Performance Indexes

```sql
-- Availability queries
CREATE INDEX idx_availability_user_day ON availability(user_id, day_of_week);

-- Blocked slots queries
CREATE INDEX idx_blocked_slots_user_date ON blocked_slots(user_id, start_time, end_time);

-- Booking queries
CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_intent ON bookings(stripe_payment_intent_id);

-- Service queries
CREATE INDEX idx_services_user_active ON services(user_id, is_active);

-- User lookups
CREATE INDEX idx_users_slug ON users(slug);
```

---

## Database Tools

### Drizzle Studio

Interactive database browser:

```bash
cd packages/api
npm run db:studio
# Opens at http://localhost:4983
```

### Generate Migration

```bash
cd packages/api
npm run db:generate
```

### Push Schema (Dev Only)

```bash
cd packages/api
npm run db:push
```

---

## Type Safety

All database types are automatically inferred:

```typescript
import { type User, type Service, type Booking } from '@/db/schema';

// TypeScript knows all fields and types
const user: User = await db.query.users.findFirst(...);
const service: Service = await db.query.services.findFirst(...);
const booking: Booking = await db.query.bookings.findFirst(...);
```

---

## Next Steps

- [Payment Flows →](./04-payment-flows.md)
- [API Endpoints →](../api/routes.md)
- [Migration Guide →](../../MIGRATIONS_DOCKER.md)
