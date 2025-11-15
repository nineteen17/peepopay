# PeepoPay Multi-Vertical Platform & Refund Policy System - Implementation TODO

> **Vision**: Transform PeepoPay from tradie-specific to industry-agnostic booking infrastructure
>
> **Focus**: Core technical implementation only - code changes, database updates, API logic
>
> **Timeline**: 4-6 weeks for core implementation
>
> **Last Updated**: 2025-11-15

---

## Phase 1: Terminology & Code Cleanup (Week 1) ✅ COMPLETED

### 1.1 Documentation Updates

- [x] **README.md**
  - [x] Change "Production-grade booking and payment platform for tradies" to "Production-grade booking and payment infrastructure for service businesses"
  - [x] Add multi-vertical examples (dentists, lawyers, mechanics, salons, tradies)
  - [x] Update feature list: "provider" instead of "tradie"
  - [x] Update architecture diagram comments

- [x] **Docs/architecture/*.md**
  - [x] Find/replace "tradie" → "provider" across all architecture docs
  - [x] Update "Tradie Dashboard" → "Business Dashboard"
  - [x] Update example scenarios to show multiple industries

- [ ] **Docs/refund-policy.md** (Deferred to Phase 10 - Protection Addons)
  - [ ] Replace "Bad Weather Protection" section with "Industry-Specific Protection Addons"
  - [ ] Add examples across verticals: Sick Day (medical), Court Delay (legal), Parts Delay (automotive)
  - [ ] Add table comparing policy needs across industries

### 1.2 Code Comments & Variable Names

- [x] **packages/api/src/modules/users/**
  - [x] Review comments, update tradie → provider where appropriate
  - [x] Variable names already generic (no changes needed)

- [x] **packages/api/src/modules/services/**
  - [x] Update comments to be industry-neutral

- [x] **packages/api/src/modules/bookings/**
  - [x] Update comments: "tradie" → "provider" or "service provider"
  - [x] Update log messages to be generic

- [x] **packages/dashboard/**
  - [x] Update UI text strings to be generic
  - [x] Change "Tradie Dashboard" → "Business Dashboard" in titles
  - [x] Review tooltips and help text

- [x] **packages/widget/**
  - [x] Ensure all text is completely generic (no industry-specific terms)

### 1.3 Email Templates

- [x] **packages/api/src/emails/**
  - [x] Review all templates for tradie-specific language
  - [x] Update to generic "provider" or "business" terminology
  - [x] Ensure templates work for any industry

### 1.4 API Response Messages

- [x] **Error messages**
  - [x] "Tradie has not set up payments" → "Provider has not set up payments"
  - [x] Review all AppError messages for generic wording

- [x] **Console logs**
  - [x] Update log messages using "tradie" to "provider"

**Git Commits:**
- feat(docs,emails): Update terminology from tradie-specific to multi-vertical
- feat(api): Update terminology from tradie-specific to multi-vertical
- feat(dashboard): Update terminology from tradie-specific to multi-vertical

---

## Phase 2: Database Schema - Refund Policy System (Week 2) ✅ COMPLETED

### 2.1 Create Migration File

- [x] **Create**: `packages/api/drizzle/0000_peaceful_omega_flight.sql` (regenerated base migration with all policy fields)

### 2.2 Services Table - Add Policy Fields

- [x] **Migration SQL**:
  - [x] Add `cancellation_window_hours` integer DEFAULT 24
  - [x] Add `late_cancellation_fee` integer NULL (in cents)
  - [x] Add `no_show_fee` integer NULL (in cents)
  - [x] Add `allow_partial_refunds` boolean DEFAULT true
  - [x] Add `auto_refund_on_cancel` boolean DEFAULT true
  - [x] Add `flex_pass_enabled` boolean DEFAULT false
  - [x] Add `flex_pass_price` integer NULL (in cents)
  - [x] Add `flex_pass_revenue_share_percent` integer DEFAULT 60
  - [x] Add `flex_pass_rules_json` jsonb NULL
  - [x] Add `minimum_cancellation_hours` integer DEFAULT 2
  - [x] Add `protection_addons` jsonb NULL
  - [x] Add indexes on new fields

- [x] **Update Schema**: `packages/api/src/db/schema/services.ts`
  - [x] Add all new fields with proper TypeScript types
  - [x] Add Zod validation schemas (using drizzle-orm types)
  - [x] Add JSDoc comments via database COMMENT statements
  - [x] Update insertServiceSchema with validation

### 2.3 Bookings Table - Add Policy Tracking Fields

- [x] **Migration SQL**:
  - [x] Add `cancellation_time` timestamp NULL
  - [x] Add `cancellation_reason` text NULL
  - [x] Add `flex_pass_purchased` boolean DEFAULT false
  - [x] Add `flex_pass_fee` integer NULL (in cents)
  - [x] Add `policy_snapshot_json` jsonb NULL (CRITICAL: stores policy at booking time)
  - [x] Add `refund_amount` integer NULL (in cents)
  - [x] Add `refund_reason` text NULL
  - [x] Add `fee_charged` integer NULL (in cents)
  - [x] Add `dispute_status` text DEFAULT 'none' (enum: 'none', 'pending', 'resolved_customer', 'resolved_provider')
  - [x] Add `dispute_reason` text NULL
  - [x] Add `dispute_created_at` timestamp NULL
  - [x] Add `dispute_resolved_at` timestamp NULL
  - [x] Add `vertical_data` jsonb NULL
  - [x] Add 'no_show' to status enum
  - [x] Add indexes on cancellation_time, dispute_status, flex_pass_purchased

- [x] **Update Schema**: `packages/api/src/db/schema/bookings.ts`
  - [x] Add all new fields with proper TypeScript types
  - [x] Update BookingStatus type to include 'no_show'
  - [x] Add Zod validation schemas (using drizzle-orm types)
  - [x] Add JSDoc comments via database COMMENT statements
  - [x] Update insertBookingSchema
  - [x] Update booking state machine in bookings.service.ts

### 2.4 Users Table - Add Industry Vertical

- [x] **Migration SQL**:
  - [x] Add `industry_vertical` text DEFAULT 'general' (enum: 'general', 'trade', 'medical', 'legal', 'automotive', 'beauty', 'consulting')
  - [x] Add `industry_subcategory` text NULL
  - [x] Add `enabled_features` jsonb NULL
  - [x] Add `vertical_tier` text DEFAULT 'core' (enum: 'core', 'vertical', 'white_label')
  - [x] Add index on industry_vertical

- [x] **Update Schema**: `packages/api/src/db/schema/users.ts`
  - [x] Add all new fields with proper TypeScript types
  - [x] Add Zod validation schemas (using drizzle-orm types)
  - [x] Add JSDoc comments via database COMMENT statements

### 2.5 Run Migration

- [x] Generate migration: `npx drizzle-kit generate` (regenerated from schema)
- [x] Review generated SQL (verified all fields present)
- [x] Test locally: `docker-compose run --rm migrate` (successful)
- [x] Verify in database: All tables, columns, constraints, and indexes confirmed

**Git Commit:**
- feat(api): Implement comprehensive refund policy and multi-vertical support system

**Notes:**
- Migrated drizzle.config.ts to latest drizzle-kit syntax
- Regenerated migration system for consistency
- Successfully applied to Docker Postgres database
- All refund policy fields and industry vertical fields verified in database
- [ ] Update MIGRATIONS_DOCKER.md with new migration

---

## Phase 3: Policy Snapshot System (Week 3) ✅ COMPLETED

### 3.1 Create Policy Snapshot Module

- [x] **Create**: `packages/api/src/lib/policySnapshot.ts`
  - [x] Type: `PolicySnapshot` interface with all policy fields
  - [x] Function: `createPolicySnapshot(service): PolicySnapshot`
  - [x] Function: `getPolicyFromSnapshot(booking): PolicySnapshot`
  - [x] Function: `validatePolicySnapshot(snapshot): boolean`
  - [x] Add error handling
  - [x] Add TypeScript types
  - [x] Add helper functions: `hasValidPolicySnapshot()`, `getPolicySummary()`

### 3.2 Update Booking Creation

- [x] **Update**: `packages/api/src/modules/bookings/bookings.service.ts`
  - [x] In `createBooking()` method (~line 168):
    - [x] Import policySnapshot functions
    - [x] Call `createPolicySnapshot(service)`
    - [x] Store snapshot in `policySnapshotJson` field
    - [x] Include `serviceVersion: service.updatedAt` in snapshot
    - [x] Add logging: "Policy snapshot created for booking {id}"

### 3.3 Testing

- [x] **Created**: `packages/api/src/lib/policySnapshot.test.ts`
  - [x] 21 comprehensive unit tests covering all functionality
  - [x] Tests for snapshot creation with various service configurations
  - [x] Tests for snapshot validation and error handling
  - [x] Tests for edge cases and immutability
  - [x] All tests passing ✅

**Git Commits:**
- feat(api): Implement policy snapshot system for booking refund policies

**Notes:**
- Policy snapshot ensures refund calculations use policy at booking time, not current policy
- Comprehensive validation with Zod schemas
- Helper functions for summary generation and validation checks
- Robust error handling for invalid or missing snapshots

---

## Phase 4: Refund Calculation Engine (Week 3-4) ✅

### 4.1 Create Refund Calculator Module ✅

- [x] **Create**: `packages/api/src/lib/refundCalculator.ts`
  - [x] Type: `RefundResult` interface:
    ```typescript
    {
      refundAmount: number;
      feeCharged: number;
      reason: RefundReason; // Enum with reason codes
      explanation: string;
      calculatedAt: Date;
      hoursUntilBooking: number;
      policyUsed: 'snapshot' | 'current_service' | 'none';
    }
    ```
  - [x] Function: `calculateRefundAmount(booking, cancellationTime, timezone): RefundResult`
    - [x] Parse policy from snapshot
    - [x] Check if flex pass purchased → full refund
    - [x] Calculate hours until booking
    - [x] Check cancellation window
    - [x] Apply late cancellation fee if outside window
    - [x] Handle no-refund policies
    - [x] Return structured result
  - [x] Function: `calculateNoShowFee(booking): number`
  - [x] Function: `calculateFlexPassSplit(flexPassPrice, revenueSharePercent): FlexPassSplit`
  - [x] Add validation: refund never exceeds deposit paid (`validateRefundAmount()`)
  - [x] Add timezone handling with date-fns-tz
  - [x] Function: `getRefundPolicySummary(policy): string`

### 4.2 Update Cancellation Logic ✅

- [x] **Update**: `packages/api/src/modules/bookings/bookings.service.ts`
  - [x] In `cancelBooking()` method (~line 256):
    - [x] Import refundCalculator
    - [x] Call `calculateRefundAmount(booking, new Date())`
    - [x] Store `cancellationTime` in database
    - [x] Store `refundAmount` in database
    - [x] Store `feeCharged` in database
    - [x] Store `refundReason` in database
    - [x] Store `cancellationReason` (from explanation) in database
    - [x] Update Stripe refund to use calculated amount (partial refunds)
    - [x] Update status based on refund result
    - [x] Update email to include refund breakdown

### 4.3 Update Stripe Refund Function ✅

- [x] **Update**: `packages/api/src/lib/stripe.ts`
  - [x] Update `createRefund()` signature to accept params object
  - [x] Support partial refunds (optional amount parameter)
  - [x] Add metadata to Stripe refund with reason, booking ID, fee charged
  - [x] Add comprehensive error handling for Stripe errors
  - [x] Add input validation (payment intent ID, negative amounts)
  - [x] Add JSDoc documentation with examples

### 4.4 Testing ✅

- [x] **Create**: `packages/api/src/lib/refundCalculator.test.ts`
  - [x] 34 comprehensive unit tests covering:
    - [x] Full refunds within cancellation window
    - [x] Partial refunds with late fees
    - [x] No refunds for late cancellations
    - [x] Flex pass override scenarios
    - [x] Already refunded bookings
    - [x] No-show fee calculations
    - [x] Flex pass revenue splits
    - [x] Validation edge cases
    - [x] Timezone handling
    - [x] Real-world scenarios (plumber, dental, etc.)
  - [x] All tests passing ✅

---

## Phase 5: No-Show Detection System (Week 4) ✅ COMPLETED

### 5.1 Create No-Show Detection Module

- [x] **Create**: `packages/api/src/lib/noShowDetection.ts`
  - [x] Function: `checkForNoShows(): Promise<Booking[]>`
    - [x] Find bookings where:
      - [x] status = 'confirmed'
      - [x] bookingDate < (now - 2 hours) // grace period
    - [x] Return list of no-show bookings
  - [x] Function: `markAsNoShow(bookingId, userId): Promise<Booking>`
    - [x] Validate booking ownership
    - [x] Update status to 'no_show'
    - [x] Charge no-show fee if configured
    - [x] Send notification
    - [x] Return updated booking
  - [x] Function: `chargeNoShowFee(booking): Promise<StripeCharge>`
    - [x] Get policy from snapshot
    - [x] Create Stripe charge for no-show fee (integrated into markAsNoShow)
    - [x] Store fee in booking
    - [x] Handle Stripe errors

### 5.2 Update Booking State Machine

- [x] **Update**: `packages/api/src/modules/bookings/bookings.service.ts`
  - [x] Update `VALID_STATUS_TRANSITIONS`:
    - [x] Add: `confirmed: ['completed', 'cancelled', 'no_show']`
    - [x] Add: `no_show: ['refunded']` (for disputes)
  - [x] Update `validateStatusTransition()` to handle 'no_show'

### 5.3 Add Worker Job for No-Show Detection

- [x] **Update**: `packages/api/src/worker.ts`
  - [x] Add scheduled job (runs every hour)
  - [x] Call `checkForNoShows()`
  - [x] Process each no-show booking
  - [x] Add error handling and logging
  - [x] Track metrics (no-shows detected, fees charged)

### 5.4 Add Manual No-Show Endpoint

- [x] **Create Route**: `POST /api/bookings/:id/mark-no-show`
  - [x] Add to `packages/api/src/modules/bookings/bookings.controller.ts`
  - [x] Require authentication
  - [x] Validate booking ownership
  - [x] Call `markAsNoShow()`
  - [x] Return updated booking

**Git Commits:**
- feat(api): Implement Phase 5 - No-Show Detection System
- feat(api): Implement dedicated email notifications for no-shows and refunds

**Testing:**
- Created: packages/api/src/lib/noShowDetection.test.ts (17 tests, all passing ✅)

**Notes:**
- Automated hourly detection via Bull queue
- Manual no-show marking endpoint for providers
- Dedicated email notifications (NO_SHOW_NOTIFICATIONS queue)
- Fee calculation from policy snapshot with deposit fallback
- Total: 72 tests passing (21 policy + 34 refund + 17 no-show)

---

## Phase 6: Flex Pass Implementation (Week 5) ✅ BACKEND COMPLETE

### 6.1 Update Payment Intent Creation ✅

- [x] **Update**: `packages/api/src/lib/stripe.ts`
  - [x] Update `createPaymentIntent()` signature to accept flex pass info
  - [x] Calculate total amount: deposit + flex pass fee
  - [x] Calculate application fee split:
    - [x] Base platform fee (2.5% of deposit)
    - [x] Flex pass platform fee (60% of flex pass price)
    - [x] Total application fee
  - [x] Add metadata to track fee breakdown
  - [x] Store flex pass details in payment intent metadata

### 6.2 Update Booking Creation with Flex Pass ✅

- [x] **Update**: `packages/api/src/modules/bookings/bookings.service.ts`
  - [x] In `createBooking()` method:
    - [x] Accept `flexPassPurchased` boolean parameter
    - [x] Validate service has flex pass enabled
    - [x] Include flex pass price in payment intent amount
    - [x] Store `flexPassPurchased` and `flexPassFee` in booking
    - [x] Update total amount calculation

### 6.3 Widget - Add Flex Pass Option (Frontend - Pending Phase 8)

- [ ] **Update**: `packages/widget/src/components/BookingForm.tsx`
  - [ ] Fetch service policy data from API
  - [ ] Show checkbox: "Add Cancellation Protection for $X" (if enabled)
  - [ ] Display benefits clearly
  - [ ] Update price display dynamically
  - [ ] Send `flexPassPurchased` to API
  - [ ] Add tooltip explaining flex pass

- [ ] **Update API**: Service endpoint to include policy data
  - [ ] GET `/api/services/:id` include flex pass info in response

### 6.4 Update Refund Logic for Flex Pass ✅

- [x] **Update**: `packages/api/src/lib/refundCalculator.ts`
  - [x] In `calculateRefundAmount()`:
    - [x] Check `booking.flexPassPurchased` first (completed in Phase 4)
    - [x] If true → return full refund regardless of timing (completed in Phase 4)
    - [x] Set reason: 'flex_pass_protection' (completed in Phase 4)
    - [x] Otherwise continue with normal policy logic (completed in Phase 4)

**Git Commits:**
- feat(api): Implement Phase 6 - Flex Pass Payment Processing

**Testing:**
- Created: packages/api/src/lib/flexPass.test.ts (17 tests, all passing ✅)
- Total: 89 tests passing (21 policy + 34 refund + 17 no-show + 17 flex pass)

**Notes:**
- Backend payment processing fully implemented
- Revenue splits: Platform 60-70%, Provider 30-40%
- Stripe Connect application fees handle automatic revenue distribution
- Refund override logic already implemented in Phase 4
- Frontend widget integration deferred to Phase 8

---

## Phase 7: Dispute Handling (Week 5) ✅ COMPLETED

### 7.1 Create Dispute Endpoints

- [x] **Create Route**: `POST /api/bookings/:id/dispute`
  - [x] Add to `packages/api/src/modules/bookings/bookings.controller.ts`
  - [x] Accept: `disputeReason` (text, required)
  - [x] Require authentication
  - [x] Validate booking exists and user authorized
  - [x] Call service method
  - [x] Return dispute details

- [x] **Add Service Method**: `packages/api/src/modules/bookings/bookings.service.ts`
  - [x] `createDispute(bookingId, userId, reason): Promise<Booking>`
  - [x] Update `dispute_status` to 'pending'
  - [x] Store `dispute_reason` and `dispute_created_at`
  - [x] Queue notification emails
  - [x] Return updated booking

- [x] **Create Route**: `POST /api/bookings/:id/dispute/resolve`
  - [x] Admin-only endpoint (TODO: add admin middleware)
  - [x] Accept: `resolution` ('customer' | 'provider'), `notes`
  - [x] Update `dispute_status` to resolved
  - [x] Store `dispute_resolved_at`
  - [x] Process refund if needed (full refund if customer wins)
  - [x] Queue notifications
  - [x] Return result

### 7.2 Email Notifications for Disputes

- [ ] **Create**: `packages/api/src/emails/dispute-created.tsx` (Deferred to email worker implementation)
  - [ ] Provider version: "Customer disputed booking #X"
  - [ ] Customer version: "Your dispute has been received"

- [ ] **Create**: `packages/api/src/emails/dispute-resolved.tsx` (Deferred to email worker implementation)
  - [ ] Show outcome
  - [ ] Show refund details if applicable
  - [ ] Explain reasoning

- [x] **Update Queue**: `packages/api/src/lib/queue.ts`
  - [x] Add `publishDisputeCreated()`
  - [x] Add `publishDisputeResolved()`
  - [x] Add DISPUTE_CREATED and DISPUTE_RESOLVED queues

- [ ] **Update Worker**: Handle dispute emails (Deferred to email worker implementation)

### 7.3 Testing

- [x] **Created**: `packages/api/src/modules/bookings/disputes.test.ts`
  - [x] 14 comprehensive unit tests covering all functionality
  - [x] Tests for createDispute() (7 tests)
  - [x] Tests for resolveDispute() (7 tests)
  - [x] All tests passing ✅

**Git Commits:**
- feat(api): Implement Phase 7 - Dispute Handling System

**Testing:**
- Created: packages/api/src/modules/bookings/disputes.test.ts (14 tests, all passing ✅)
- Total: 103 tests passing (21 policy + 34 refund + 17 no-show + 17 flex pass + 14 dispute)

**Notes:**
- Backend dispute system fully implemented
- Customer can create disputes via POST /bookings/:id/dispute
- Admin can resolve disputes via POST /bookings/:id/dispute/resolve
- Customer wins = full refund automatically processed via Stripe
- Provider wins = no refund, booking status unchanged
- Both parties receive notifications via RabbitMQ queues
- Email templates deferred to email worker implementation
- Admin middleware for resolution endpoint marked as TODO

---

## Phase 8: Dashboard - Policy Configuration UI (Week 6)

### 8.1 Create Policy Settings Page

- [ ] **Create**: `packages/dashboard/src/app/settings/policies/page.tsx`
  - [ ] Fetch current service policy
  - [ ] Section: Cancellation Window (hours input)
  - [ ] Section: Late Cancellation Fee (dollar input, converts to cents)
  - [ ] Section: No-Show Fee (dollar input, converts to cents)
  - [ ] Section: Refund Settings
    - [ ] Toggle: Allow partial refunds
    - [ ] Toggle: Automatic refunds
  - [ ] Section: Cancellation Protection (Flex Pass)
    - [ ] Toggle: Enable
    - [ ] Input: Price (dollar input, converts to cents)
    - [ ] Slider: Platform revenue share (60-70%)
    - [ ] Preview: "Customer pays $X, you receive $Y"
  - [ ] Save button with validation
  - [ ] Show policy preview for customers

- [ ] **Add Navigation**
  - [ ] Add "Cancellation Policies" to settings sidebar
  - [ ] Update dashboard layout

### 8.2 Create API Endpoint for Policy Update

- [ ] **Create Route**: `PUT /api/services/:id/policy`
  - [ ] Add to `packages/api/src/modules/services/services.controller.ts`
  - [ ] Accept all policy fields
  - [ ] Validate values (fees must be positive, window hours reasonable)
  - [ ] Update service record
  - [ ] Invalidate cache if using Redis
  - [ ] Return updated service

---

## Phase 9: Industry Vertical System (Week 6)

### 9.1 Update Onboarding Flow

- [ ] **Update**: `packages/dashboard/src/app/onboarding/page.tsx`
  - [ ] Add step: "What type of business are you?"
  - [ ] Dropdown with options:
    - [ ] General / Other
    - [ ] Trade Services (plumber, electrician, etc.)
    - [ ] Medical & Health (dentist, doctor, physio, etc.)
    - [ ] Legal Services (lawyer, notary, etc.)
    - [ ] Automotive (mechanic, detailer, etc.)
    - [ ] Beauty & Wellness (barber, salon, spa, etc.)
    - [ ] Professional Services (consultant, accountant, etc.)
  - [ ] Free text input for subcategory
  - [ ] Send to API on submission

- [ ] **Update API**: Onboarding endpoint
  - [ ] Accept `industry_vertical` and `industry_subcategory`
  - [ ] Validate enum values
  - [ ] Store in database
  - [ ] Return user with industry info

### 9.2 Create Vertical Defaults Module

- [ ] **Create**: `packages/api/src/lib/verticalDefaults.ts`
  - [ ] Type: `VerticalPolicyDefaults` interface
  - [ ] Function: `getDefaultPolicyForVertical(vertical): VerticalPolicyDefaults`
  - [ ] Define defaults for each vertical:
    - [ ] Trade: 24hr window, $30 late fee, $50 no-show, flex pass $5
    - [ ] Medical: 48hr window, $40 late fee, $80 no-show, flex pass $10
    - [ ] Legal: 72hr window, $100 late fee, $200 no-show, flex pass $20
    - [ ] Automotive: 24hr window, $25 late fee, $40 no-show, flex pass $5
    - [ ] Beauty: 12hr window, $15 late fee, $30 no-show, flex pass $3
    - [ ] Consulting: 48hr window, $50 late fee, $100 no-show, flex pass $10
    - [ ] General: 24hr window, $20 late fee, $40 no-show, flex pass $5

### 9.3 Apply Defaults on Service Creation

- [ ] **Update**: `packages/api/src/modules/services/services.service.ts`
  - [ ] When creating first service for user:
    - [ ] Get user's industry_vertical
    - [ ] Call `getDefaultPolicyForVertical()`
    - [ ] Pre-fill policy fields with defaults
    - [ ] User can override during creation or later

---

## Phase 10: Protection Addons Architecture (Week 7)

### 10.1 Create Addon System

- [ ] **Create**: `packages/api/src/lib/protectionAddons.ts`
  - [ ] Type: `ProtectionAddon` interface:
    ```typescript
    {
      id: string;
      name: string;
      description: string;
      price: number; // cents
      applicableVerticals: string[];
      rules: {
        allowCancellationWithin: number; // hours
        refundPolicy: 'full' | 'partial' | 'none';
        requiresApproval: boolean;
        conditions: Record<string, any>;
      }
    }
    ```
  - [ ] Function: `getAddonsForVertical(vertical): ProtectionAddon[]`
  - [ ] Function: `validateAddonPurchase(addon, booking): boolean`
  - [ ] Function: `applyAddonRules(addon, booking, cancellationTime): RefundResult`

### 10.2 Define Built-in Addons

- [ ] **Built-in Addons**:
  - [ ] Bad Weather Protection (Trade) - $5-10
  - [ ] Sick Day Protection (Medical) - $8-12
  - [ ] Court Delay Protection (Legal) - $15-25
  - [ ] Parts Delay Protection (Automotive) - $10
  - [ ] Store in code or database (decision needed)

### 10.3 Update Booking Schema for Addons

- [ ] **Add to bookings table** (if not already):
  - [ ] `addons_purchased` jsonb NULL
  - [ ] Stores: `[{ addonId, name, price, rules }]`

### 10.4 Integrate Addons into Refund Logic

- [ ] **Update**: `packages/api/src/lib/refundCalculator.ts`
  - [ ] Check `booking.addons_purchased` array
  - [ ] For each addon, call `applyAddonRules()`
  - [ ] If addon conditions met → override policy
  - [ ] Return addon-based refund result

---

## Phase 11: Email Notifications - Policy Updates (Week 7)

### 11.1 Create Refund Breakdown Email

- [ ] **Create**: `packages/api/src/emails/cancellation-with-refund.tsx`
  - [ ] Show booking details
  - [ ] Show refund amount
  - [ ] Show any fees charged
  - [ ] Explain policy reason
  - [ ] Show refund timeline (5-10 days)
  - [ ] Include dispute link if applicable

### 11.2 Create No-Show Notification Email

- [ ] **Create**: `packages/api/src/emails/no-show-fee-charged.tsx`
  - [ ] Notify customer of no-show
  - [ ] Show fee charged
  - [ ] Explain policy
  - [ ] Provide dispute option
  - [ ] Show payment breakdown

### 11.3 Create Policy Reminder Email

- [ ] **Create**: `packages/api/src/emails/policy-reminder.tsx`
  - [ ] Remind customer 24hrs before booking
  - [ ] Show cancellation deadline
  - [ ] Show fee if they cancel late
  - [ ] Include flex pass status if purchased
  - [ ] Include link to cancel/reschedule

### 11.4 Update Queue and Worker

- [ ] **Update**: `packages/api/src/lib/queue.ts`
  - [ ] Add `publishPolicyReminder()`
  - [ ] Add `publishNoShowNotification()`

- [ ] **Update**: `packages/api/src/worker.ts`
  - [ ] Add worker for policy reminder emails
  - [ ] Schedule reminder jobs 24hrs before booking
  - [ ] Handle no-show fee notifications

- [ ] **Update Booking Confirmation**
  - [ ] Schedule policy reminder when booking confirmed
  - [ ] Use Bull queue delay feature

---

## Phase 12: Testing & Verification (Week 8)

### 12.1 Unit Tests - Critical Functions

- [ ] **Test**: `packages/api/src/lib/refundCalculator.ts`
  - [ ] Test within free cancellation window → full refund
  - [ ] Test outside window → partial refund with fee
  - [ ] Test no-refund policy → zero refund
  - [ ] Test flex pass override → full refund
  - [ ] Test addon override → follow addon rules
  - [ ] Test edge cases (same-day booking, past booking)

- [ ] **Test**: `packages/api/src/lib/policySnapshot.ts`
  - [ ] Test snapshot creation includes all fields
  - [ ] Test snapshot parsing returns valid object
  - [ ] Test validation catches invalid snapshots

- [ ] **Test**: `packages/api/src/lib/noShowDetection.ts`
  - [ ] Test finds bookings past grace period
  - [ ] Test marks booking as no-show
  - [ ] Test charges correct fee from policy

### 12.2 Manual Testing Checklist

- [ ] Create test account for each vertical type
- [ ] Configure different policies for each
- [ ] Test booking creation with policy snapshot
- [ ] Test cancellation within window → full refund
- [ ] Test cancellation outside window → partial refund + fee
- [ ] Test flex pass purchase and use → full refund
- [ ] Test no-show detection (manual and automatic)
- [ ] Test dispute creation and resolution
- [ ] Verify all emails send correctly
- [ ] Test dashboard policy configuration UI
- [ ] Verify widget shows correct terminology (generic)

---

## Phase 13: Production Deployment (Week 9)

### 13.1 Pre-Deployment

- [ ] Review all code changes
- [ ] Ensure all tests pass
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Create rollback plan
- [ ] Document deployment steps

### 13.2 Database Migration

- [ ] Schedule maintenance window (low traffic time)
- [ ] Run migration: `docker-compose run --rm migrate`
- [ ] Verify all tables and columns created
- [ ] Verify indexes created
- [ ] Check for migration errors

### 13.3 Code Deployment

- [ ] Deploy API changes
- [ ] Deploy dashboard changes
- [ ] Deploy widget changes
- [ ] Verify health checks pass
- [ ] Monitor logs for errors
- [ ] Check Sentry for exceptions

### 13.4 Post-Deployment Verification

- [ ] Test booking flow end-to-end
- [ ] Test cancellation with refund calculation
- [ ] Test policy configuration in dashboard
- [ ] Verify emails send correctly
- [ ] Monitor metrics for first 24 hours
- [ ] Gather initial user feedback

---

## Phase 14: Documentation Updates (Week 9)

### 14.1 Technical Documentation

- [ ] **Update**: `Docs/architecture/03-database-schema.md`
  - [ ] Document all new fields in services table
  - [ ] Document all new fields in bookings table
  - [ ] Document all new fields in users table
  - [ ] Add policy snapshot explanation
  - [ ] Add status flow diagrams for 'no_show'

- [ ] **Create**: `Docs/guides/refund-policy-system.md`
  - [ ] Explain how policy system works
  - [ ] Show refund calculation examples
  - [ ] Document flex pass logic
  - [ ] Document no-show detection
  - [ ] Document dispute process

- [ ] **Create**: `Docs/guides/multi-vertical-setup.md`
  - [ ] Explain industry vertical selection
  - [ ] Show default policies per vertical
  - [ ] Explain terminology changes
  - [ ] Show examples across industries

### 14.2 API Documentation

- [ ] **Update**: OpenAPI spec (`packages/api/src/openapi/generator.ts`)
  - [ ] Document new policy fields
  - [ ] Document dispute endpoints
  - [ ] Document flex pass parameters
  - [ ] Add examples for different scenarios

- [ ] **Update**: Swagger UI descriptions
  - [ ] Update endpoint descriptions to be generic
  - [ ] Add multi-vertical examples
  - [ ] Document policy configuration

---

## Final Checklist

### Code Quality
- [ ] All TypeScript types properly defined
- [ ] All functions have JSDoc comments
- [ ] All error cases handled gracefully
- [ ] All database queries optimized with indexes
- [ ] All API endpoints have proper authorization
- [ ] All inputs validated with Zod schemas

### Data Integrity
- [ ] Policy snapshot always created on booking
- [ ] Old bookings use old policy (snapshot not live data)
- [ ] Refund amounts never exceed deposit paid
- [ ] Fees calculated correctly with timezone handling
- [ ] No race conditions in no-show detection

### User Experience
- [ ] All terminology generic (no tradie-specific language)
- [ ] Clear error messages for policy violations
- [ ] Email notifications explain refund breakdowns
- [ ] Dashboard UI intuitive for policy configuration
- [ ] Widget shows flex pass benefits clearly

### Performance
- [ ] Refund calculation runs in < 100ms
- [ ] Policy snapshot creation doesn't slow booking
- [ ] No-show detection job runs efficiently
- [ ] Database queries use proper indexes

### Security
- [ ] All endpoints require authentication
- [ ] Booking ownership validated before actions
- [ ] Admin-only endpoints properly protected
- [ ] No sensitive data in logs
- [ ] Stripe API keys properly secured

---

## Ensure everything implemented in each phase is a part of the documentaion

---

## Notes

**Key Implementation Principles:**
1. Policy snapshot is CRITICAL - never use live service policy for old bookings
2. Always validate refund amounts don't exceed deposits
3. Handle timezones correctly in all calculations
4. Make everything industry-agnostic by default
5. Test thoroughly before deploying refund logic (money involved!)

**Success Metrics to Track Post-Launch:**
- Refund calculation accuracy (manual spot checks)
- No-show detection effectiveness (false positives/negatives)
- Flex pass purchase rate
- Cancellation rate changes
- Dispute rate (should be < 2%)
- Policy configuration adoption rate

**Critical Paths to Test:**
1. Booking → Cancel within window → Full refund
2. Booking → Cancel outside window → Partial refund + fee
3. Booking with flex pass → Cancel anytime → Full refund
4. Booking → No-show → Fee charged
5. Policy change → New booking → Uses new policy (old bookings use snapshot)

---

**Document Version**: 2.0 (Streamlined)
**Created**: 2025-11-15
**Last Updated**: 2025-11-15
**Focus**: Technical implementation only
**Status**: Ready for Implementation
