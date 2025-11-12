# PeepoPay API - Critical Issues Fix Plan

## Executive Summary

This plan addresses **8 critical bugs**, **15 high-priority issues**, and implements the **missing availability system**. Estimated time: **2-3 weeks** of focused development.

---

## Phase 1: Critical Runtime Errors (Day 1)
**Goal**: Fix bugs that will crash the application on startup or first use

### 1.1 Fix CacheService Constructor Error ⚠️ CRITICAL
**File**: `packages/api/src/lib/redis.ts`, `services.service.ts`
**Issue**: CacheService called without required redis parameter
**Impact**: Runtime error when accessing services

**Steps**:
1. Update `CacheService` to use singleton pattern with `getRedisClient()`
2. Or export factory function `createCacheService()`
3. Update all service classes to use factory

**Files to modify**:
- `src/lib/redis.ts` - Add factory function
- `src/modules/services/services.service.ts` - Fix constructor
- Any other services using CacheService

**Estimated time**: 30 minutes

---

### 1.2 Fix Booking User Assignment ⚠️ CRITICAL
**File**: `packages/api/src/modules/bookings/bookings.service.ts:95`
**Issue**: Booking assigned to tradie instead of customer

**Steps**:
1. Review booking creation logic
2. Determine if we need customer as separate user OR store customer info only
3. Options:
   - **Option A**: Keep current - `userId` = tradie (service owner)
   - **Option B**: Add `customerId` field - reference to customer user
   - **Option C**: Customer data only (email, name, phone) - no user account

**Decision needed**: How should customer identity work?
- Anonymous customers (no accounts) - simpler for MVP
- Customer accounts (can view booking history) - better UX

**Recommendation**: Start with Option A + customer fields (email, name, phone)

**Files to modify**:
- `src/db/schema/bookings.ts` - Clarify field usage
- `src/modules/bookings/bookings.service.ts` - Update logic
- Documentation

**Estimated time**: 1 hour

---

### 1.3 Fix Schema Mismatches ⚠️ CRITICAL
**Files**: Multiple schema files
**Issue**: Implementation doesn't match documentation

**Schema fixes needed**:

#### Bookings Schema
```typescript
// Current: timestamp
bookingDate: timestamp('booking_date').notNull(),

// Should be: separate date and time OR keep timestamp but document it
// DECISION: Keep timestamp (more flexible), update docs
```

#### Services Schema - Add Missing Fields
```typescript
// Add depositType field
depositType: text('deposit_type', { enum: ['percentage', 'fixed'] }).default('fixed'),

// Keep depositAmount as integer (cents) for precision
// Update documentation to reflect cents not dollars
```

#### Bookings Schema - Add Payment Tracking
```typescript
// Add separate payment status
depositStatus: text('deposit_status', {
  enum: ['pending', 'paid', 'failed', 'refunded']
}).default('pending'),
```

**Files to modify**:
- `src/db/schema/bookings.ts`
- `src/db/schema/services.ts`
- Generate migration
- Update documentation

**Estimated time**: 2 hours

---

## Phase 2: Availability System Implementation (Days 2-4)
**Goal**: Implement complete availability/scheduling system from scratch

### 2.1 Create Availability Module Structure
**Files to create**:
- `src/modules/availability/availability.service.ts`
- `src/modules/availability/availability.controller.ts`
- `src/modules/availability/index.ts`

**Estimated time**: 30 minutes

---

### 2.2 Implement Availability Service
**File**: `src/modules/availability/availability.service.ts`

**Core methods**:
```typescript
class AvailabilityService {
  // CRUD for availability rules
  async getAvailabilityRules(userId: string)
  async createAvailabilityRule(userId: string, data: NewAvailability)
  async updateAvailabilityRule(ruleId: string, userId: string, data: Partial<NewAvailability>)
  async deleteAvailabilityRule(ruleId: string, userId: string)

  // Blocked slots
  async createBlockedSlot(userId: string, data: NewBlockedSlot)
  async deleteBlockedSlot(slotId: string, userId: string)
  async getBlockedSlots(userId: string, startDate: Date, endDate: Date)

  // Slot calculation - CORE BUSINESS LOGIC
  async getAvailableSlots(slug: string, date: string, serviceDuration: number)
  async isSlotAvailable(userId: string, startTime: Date, duration: number)
}
```

**Slot calculation algorithm**:
```typescript
async getAvailableSlots(slug: string, date: string, serviceDuration: number) {
  // 1. Get user by slug
  // 2. Get availability rules for day of week
  // 3. Get existing bookings for date
  // 4. Get blocked slots for date
  // 5. Calculate free slots:
  //    - For each availability rule:
  //      - Generate time slots (startTime to endTime, step = serviceDuration)
  //      - Remove occupied slots (bookings + blocked)
  //      - Account for break times
  //    - Merge all available slots
  //    - Sort chronologically
  // 6. Cache result (TTL: 5 minutes)
  // 7. Return slots
}
```

**Edge cases to handle**:
- No availability rules defined → return empty array
- Service duration > available time block → skip that block
- Break times within availability window
- Blocked slots (one-time and recurring)
- Past time slots (don't show slots before current time)

**Estimated time**: 1 day

---

### 2.3 Create Availability Controller & Routes
**File**: `src/modules/availability/availability.controller.ts`

**Endpoints**:
```typescript
// Public
GET    /api/availability/:slug?date=YYYY-MM-DD&duration=60
  → getAvailableSlots(slug, date, duration)

// Protected (tradie only)
GET    /api/availability                    → getMyAvailabilityRules()
POST   /api/availability                    → createAvailabilityRule()
PUT    /api/availability/:id                → updateAvailabilityRule()
DELETE /api/availability/:id                → deleteAvailabilityRule()

POST   /api/availability/blocked-slots      → createBlockedSlot()
DELETE /api/availability/blocked-slots/:id  → deleteBlockedSlot()
GET    /api/availability/blocked-slots      → getBlockedSlots()
```

**Estimated time**: 4 hours

---

### 2.4 Register Availability Routes
**File**: `src/index.ts`

```typescript
import availabilityController from './modules/availability/availability.controller.js';
app.use('/api/availability', availabilityController);
```

**Estimated time**: 5 minutes

---

### 2.5 Add Database Indexes for Availability
**File**: Migration file

```sql
CREATE INDEX idx_availability_user_day ON availability(user_id, day_of_week);
CREATE INDEX idx_blocked_slots_user_date ON blocked_slots(user_id, start_time, end_time);
CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
```

**Estimated time**: 30 minutes

---

### 2.6 Fix Day of Week Schema Issue
**File**: `src/db/schema/availability.ts`

**Options**:
- **Option A**: Keep text enum, add helper functions to convert
- **Option B**: Change to integer (0-6), update docs

**Recommendation**: Keep text enum (more readable), add utility functions

```typescript
// Add utility
export function getJSDayOfWeek(jsDay: number): DayOfWeek {
  const mapping = ['sunday', 'monday', 'tuesday', ...];
  return mapping[jsDay] as DayOfWeek;
}
```

**Estimated time**: 1 hour

---

## Phase 3: Double-Booking Prevention (Day 5)
**Goal**: Ensure booking integrity

### 3.1 Add Booking Conflict Validation
**File**: `src/modules/bookings/bookings.service.ts`

**Add method**:
```typescript
async checkBookingConflict(
  userId: string,
  bookingDate: Date,
  duration: number
): Promise<boolean> {
  const endTime = new Date(bookingDate.getTime() + duration * 60000);

  const conflicts = await db.query.bookings.findMany({
    where: and(
      eq(bookings.userId, userId),
      eq(bookings.status, 'confirmed'), // or 'pending'
      // Check for time overlap
      or(
        // Existing booking starts during new booking
        and(
          gte(bookings.bookingDate, bookingDate),
          lt(bookings.bookingDate, endTime)
        ),
        // Existing booking ends during new booking
        // (need to calculate existing end time)
      )
    )
  });

  return conflicts.length > 0;
}
```

**Update createBooking**:
```typescript
async createBooking(data: NewBooking) {
  // 1. Validate service exists
  // 2. Check availability slot is available
  // 3. Check for booking conflicts ← NEW
  // 4. Create payment intent
  // 5. Create booking
}
```

**Estimated time**: 3 hours

---

### 3.2 Add Transaction Support
**File**: `src/modules/bookings/bookings.service.ts`

Wrap booking creation in transaction:
```typescript
await db.transaction(async (tx) => {
  // Check conflicts
  // Create booking
  // Create payment intent
  // Update booking with payment intent ID
});
```

**Estimated time**: 1 hour

---

## Phase 4: Timezone Handling (Day 6)
**Goal**: Proper timezone support for bookings and availability

### 4.1 Create Timezone Utility Module
**File**: `src/lib/timezone.ts`

```typescript
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

export function convertToUserTimezone(date: Date, timezone: string): Date {
  return utcToZonedTime(date, timezone);
}

export function convertToUTC(date: Date, timezone: string): Date {
  return zonedTimeToUtc(date, timezone);
}

export function formatInTimezone(
  date: Date,
  timezone: string,
  formatStr: string
): string {
  return format(utcToZonedTime(date, timezone), formatStr, { timeZone: timezone });
}
```

**Estimated time**: 2 hours

---

### 4.2 Update Booking Creation
**File**: `src/modules/bookings/bookings.service.ts`

```typescript
async createBooking(data: NewBooking) {
  const service = await this.getService(data.serviceId);
  const tradie = await getUserById(service.userId);

  // Convert booking date from customer timezone to UTC
  const bookingDateUTC = convertToUTC(
    new Date(data.bookingDate),
    tradie.timezone || 'Australia/Sydney'
  );

  // Store in UTC
  await db.insert(bookings).values({
    ...data,
    bookingDate: bookingDateUTC,
  });
}
```

**Estimated time**: 2 hours

---

### 4.3 Update Availability Calculation
**File**: `src/modules/availability/availability.service.ts`

```typescript
async getAvailableSlots(slug: string, date: string, duration: number) {
  const user = await getUserBySlug(slug);
  const timezone = user.timezone || 'Australia/Sydney';

  // Convert requested date to user's timezone
  const localDate = new Date(date); // ISO string

  // Generate slots in user's local time
  // Convert to UTC for storage/comparison
  // Return slots in user's local time for display
}
```

**Estimated time**: 2 hours

---

## Phase 5: High-Priority Fixes (Days 7-8)

### 5.1 Add Rate Limiting
**File**: `src/middleware/rateLimiter.ts` (new)

```typescript
import rateLimit from 'express-rate-limit';

export const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 bookings per IP per 15 minutes
  message: 'Too many booking requests, please try again later',
});
```

**Apply to booking endpoint**:
```typescript
router.post('/', publicBookingLimiter, async (req, res) => {
  // ...
});
```

**Estimated time**: 1 hour

---

### 5.2 Add Booking State Machine
**File**: `src/modules/bookings/bookings.service.ts`

```typescript
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [], // Terminal state
  completed: ['refunded'],
  refunded: [], // Terminal state
};

function validateStatusTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}
```

**Estimated time**: 2 hours

---

### 5.3 Fix Service Query Performance
**File**: `src/modules/services/services.service.ts`

```typescript
async getServicesByUserSlug(slug: string) {
  // Use join instead of fetching all and filtering
  const user = await db.query.users.findFirst({
    where: eq(users.slug, slug),
    with: {
      services: {
        where: eq(services.isActive, true),
        orderBy: (services, { asc }) => [asc(services.name)],
      },
    },
  });

  return user?.services || [];
}
```

**Estimated time**: 1 hour

---

### 5.4 Add Input Sanitization
**Install**: `npm install validator`
**File**: `src/middleware/sanitize.ts` (new)

```typescript
import validator from 'validator';

export function sanitizeBookingInput(data: any) {
  return {
    ...data,
    customerName: validator.escape(data.customerName),
    customerEmail: validator.normalizeEmail(data.customerEmail),
    customerPhone: validator.trim(data.customerPhone),
    notes: data.notes ? validator.escape(data.notes) : undefined,
  };
}
```

**Estimated time**: 1 hour

---

### 5.5 Add Missing Customer Fields
**File**: `src/db/schema/bookings.ts`

```typescript
export const bookings = pgTable('bookings', {
  // ... existing fields
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(), // Make required
  customerAddress: text('customer_address'), // Optional for now
});
```

**Generate migration**

**Estimated time**: 30 minutes

---

## Phase 6: Documentation & Testing (Days 9-10)

### 6.1 Update API Documentation
**Files**:
- `Docs/architecture/03-database-schema.md` - Update schema docs
- `Docs/architecture/02-system-design.md` - Update flow diagrams
- Create `Docs/architecture/04-payment-flows.md` - Missing file

**Estimated time**: 4 hours

---

### 6.2 Generate OpenAPI Spec
**File**: `src/openapi/generator.ts`

Run: `npm run generate:openapi`

Ensure Swagger UI works at `/api-docs`

**Estimated time**: 1 hour

---

### 6.3 Add Basic Tests
**Files**: Create test files for critical paths
- `tests/bookings.test.ts` - Booking creation, conflict detection
- `tests/availability.test.ts` - Slot calculation
- `tests/webhooks.test.ts` - Payment webhook processing

**Estimated time**: 8 hours (out of scope for immediate fixes)

---

## Phase 7: Medium Priority Improvements (Days 11-14)

### 7.1 Add Refund Endpoint
**File**: `src/modules/bookings/bookings.controller.ts`

```typescript
POST /api/bookings/:id/refund
  → refundBooking(id, amount)
```

**Estimated time**: 3 hours

---

### 7.2 Add Booking Modification
```typescript
PUT /api/bookings/:id
  → updateBooking(id, data) // Reschedule
```

**Estimated time**: 4 hours

---

### 7.3 Improve Cache Service
**File**: `src/lib/redis.ts`

- Use singleton pattern
- Add cache warming
- Variable TTLs by data type
- Cache invalidation events

**Estimated time**: 4 hours

---

### 7.4 Add Webhook Deduplication
**File**: `src/modules/webhooks/webhooks.service.ts`

Track processed webhook IDs in Redis with TTL

**Estimated time**: 2 hours

---

## Execution Plan Summary

### Day 1: Critical Runtime Errors ⚠️
- [ ] Fix CacheService constructor
- [ ] Fix booking user assignment
- [ ] Fix schema mismatches
- [ ] Generate migrations

### Days 2-4: Availability System 🚀
- [ ] Create availability module structure
- [ ] Implement availability service with slot calculation
- [ ] Create availability controller & routes
- [ ] Register routes in main app
- [ ] Add database indexes
- [ ] Fix day of week schema

### Day 5: Double-Booking Prevention 🔒
- [ ] Add booking conflict validation
- [ ] Add transaction support
- [ ] Test conflict detection

### Day 6: Timezone Handling 🌍
- [ ] Create timezone utility module
- [ ] Update booking creation with timezone conversion
- [ ] Update availability calculation with timezone support
- [ ] Test with different timezones

### Days 7-8: High Priority Fixes 🔧
- [ ] Add rate limiting to public endpoints
- [ ] Implement booking state machine
- [ ] Fix service query performance
- [ ] Add input sanitization
- [ ] Add missing customer fields

### Days 9-10: Documentation 📚
- [ ] Update database schema docs
- [ ] Update system design docs
- [ ] Generate OpenAPI spec
- [ ] Test all endpoints

### Days 11-14: Medium Priority (Optional) 📈
- [ ] Add refund endpoint
- [ ] Add booking modification
- [ ] Improve cache service
- [ ] Add webhook deduplication

---

## Dependencies to Install

```bash
cd packages/api
npm install express-rate-limit validator date-fns-tz
npm install --save-dev @types/validator
```

---

## Database Migrations Needed

1. **Add depositType to services**
2. **Add depositStatus to bookings**
3. **Make customerPhone required in bookings**
4. **Add customerAddress to bookings (optional)**
5. **Add refund tracking fields to bookings**
6. **Create indexes for performance**

---

## Risk Assessment

### High Risk
- Availability system is complex - needs thorough testing
- Timezone handling can introduce subtle bugs
- Schema changes require careful migration

### Medium Risk
- Double-booking prevention logic needs edge case testing
- State machine transitions need validation

### Low Risk
- CacheService fix is straightforward
- Rate limiting is standard middleware
- Documentation updates are safe

---

## Success Criteria

### Must Have (MVP)
- ✅ No runtime errors on startup
- ✅ Availability system fully functional
- ✅ No double-bookings possible
- ✅ Webhooks process correctly
- ✅ Bookings assigned correctly
- ✅ Timezone support working

### Should Have (Beta)
- ✅ Rate limiting on public endpoints
- ✅ Booking state machine validation
- ✅ Input sanitization
- ✅ Performance optimizations
- ✅ Updated documentation

### Nice to Have (v1.0)
- ✅ Refund endpoint
- ✅ Booking modification
- ✅ Comprehensive tests
- ✅ Webhook deduplication

---

## Notes

- Each phase commits are made for rollback safety
- Testing should happen after each phase
- Docker Compose should be tested regularly
- Documentation updated incrementally

---

**Total Estimated Time**: 10-14 days of focused development

**Next Step**: Review plan, prioritize, then execute phase by phase
