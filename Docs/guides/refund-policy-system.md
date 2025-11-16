# Refund Policy System

> **Implementation Status**: Phase 7 Complete (Dispute Handling)
>
> **Last Updated**: 2025-11-15

## Overview

The PeepoPay refund policy system provides flexible, fair, and automated refund processing for service bookings. It supports industry-specific policies, cancellation protection (Flex Pass), and ensures that refunds are always calculated using the policy that was in effect at booking time.

## Key Features

- ✅ **Policy Snapshots** - Immutable policy records at booking time (Phase 3)
- ✅ **Flexible Cancellation Windows** - Customizable time-based refund rules (Phase 4)
- ✅ **Late Cancellation Fees** - Configurable penalties for cancellations outside window (Phase 4)
- ✅ **Refund Calculation Engine** - Automated refund calculations with timezone support (Phase 4)
- ✅ **Flex Pass Override** - Optional cancellation protection for full refunds (Phase 4)
- ✅ **No-Show Detection** - Automatic detection and fee charging with hourly cron job (Phase 5)
- ✅ **Flex Pass Payment Processing** - Revenue split and payment integration (Phase 6)
- ✅ **Dispute Resolution** - Built-in dispute handling workflow (Phase 7)
- ⏳ **Industry Defaults** - Pre-configured policies for different verticals (Phase 9)

## Architecture

### 1. Policy Snapshot System (Phase 3 ✅)

**Problem**: If a provider changes their refund policy, should old bookings use the new policy or the old one?

**Solution**: Policy snapshots ensure fairness by capturing the policy at booking time.

#### How It Works

```typescript
// When a booking is created
const policySnapshot = createPolicySnapshot(service);

await db.insert(bookings).values({
  ...bookingData,
  policySnapshotJson: policySnapshot, // Stored as JSONB
});
```

#### Policy Snapshot Structure

```typescript
interface PolicySnapshot {
  // Service identification
  serviceId: string;
  serviceName: string;
  serviceVersion: Date; // service.updatedAt at snapshot time
  snapshotCreatedAt: Date;

  // Pricing (for reference)
  depositAmount: number;
  depositType: 'percentage' | 'fixed';
  fullPrice: number | null;

  // Cancellation Policy
  cancellationWindowHours: number; // e.g., 24 hours
  minimumCancellationHours: number; // e.g., 2 hours
  lateCancellationFee: number | null; // in cents
  noShowFee: number | null; // in cents
  allowPartialRefunds: boolean;
  autoRefundOnCancel: boolean;

  // Flex Pass
  flexPassEnabled: boolean;
  flexPassPrice: number | null;
  flexPassRevenueSharePercent: number; // 60-70%
  flexPassRulesJson: Record<string, any> | null;

  // Protection Addons
  protectionAddons: Array<{
    id: string;
    name: string;
    price: number;
    rules: Record<string, any>;
  }> | null;
}
```

#### Usage Example

```typescript
import { getPolicyFromSnapshot } from '@/lib/policySnapshot';

// Retrieve policy from booking
const policy = getPolicyFromSnapshot(booking);

if (!policy) {
  // Fallback: use current service policy (for old bookings without snapshots)
  console.warn('No policy snapshot found, using current service policy');
}

// Use policy for refund calculation
const refund = calculateRefund(policy, booking, cancellationTime);
```

#### API Functions

**File**: `packages/api/src/lib/policySnapshot.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `createPolicySnapshot(service)` | Capture policy at booking time | `PolicySnapshot` |
| `getPolicyFromSnapshot(booking)` | Retrieve policy from booking | `PolicySnapshot \| null` |
| `validatePolicySnapshot(snapshot)` | Validate snapshot integrity | `boolean` |
| `hasValidPolicySnapshot(booking)` | Check if booking has valid snapshot | `boolean` |
| `getPolicySummary(snapshot)` | Human-readable policy description | `string` |

### 2. Refund Calculation Engine (Phase 4 ✅)

The refund calculator uses the policy snapshot to determine:
- Refund amount based on cancellation timing
- Any fees to charge (late cancellation, no-show)
- Flex pass overrides (full refund regardless of timing)
- Already-refunded detection
- Timezone-aware calculations

**Implementation**: `packages/api/src/lib/refundCalculator.ts`

```typescript
interface RefundResult {
  refundAmount: number; // Amount to refund in cents
  feeCharged: number; // Fee charged to customer in cents
  reason: RefundReason; // Machine-readable reason code
  explanation: string; // Human-readable explanation
  calculatedAt: Date; // When calculation was performed
  hoursUntilBooking: number; // Hours from cancellation to booking
  policyUsed: 'snapshot' | 'current_service' | 'none'; // Which policy was used
}

type RefundReason =
  | 'within_window' // Cancelled within free cancellation window
  | 'late_cancellation' // Cancelled outside window, partial refund
  | 'flex_pass_protection' // Flex pass purchased, full refund
  | 'no_refund_too_late' // Too close to booking time, no refund
  | 'no_refund_policy' // Service doesn't allow refunds
  | 'no_show' // Customer didn't show up
  | 'already_refunded'; // Already refunded

// Usage
const result = calculateRefundAmount(booking, cancellationTime, 'America/New_York');
console.log(result);
// {
//   refundAmount: 5000, // $50.00
//   feeCharged: 0,
//   reason: 'within_window',
//   explanation: 'Cancelled 48.0 hours before booking. Free cancellation window: 24 hours',
//   calculatedAt: 2024-01-20T15:30:00.000Z,
//   hoursUntilBooking: 48.0,
//   policyUsed: 'snapshot'
// }
```

**Available Functions**:
- `calculateRefundAmount(booking, cancellationTime, timezone)` - Main calculation
- `calculateNoShowFee(booking)` - Extract no-show fee from policy
- `calculateFlexPassSplit(flexPassPrice, platformPercent)` - Revenue distribution
- `validateRefundAmount(refundAmount, depositAmount)` - Safety validation
- `getRefundPolicySummary(policy)` - Human-readable policy description

### 3. Cancellation Windows

Different industries have different needs:

| Industry | Typical Window | Late Fee | No-Show Fee |
|----------|---------------|----------|-------------|
| Trade Services | 24 hours | $30 | $50 |
| Medical/Dental | 48 hours | $40 | $80 |
| Legal Services | 72 hours | $100 | $200 |
| Automotive | 24 hours | $25 | $40 |
| Beauty/Salon | 12 hours | $15 | $30 |
| Professional Consulting | 48 hours | $50 | $100 |

### 4. Flex Pass (Cancellation Protection)

Optional add-on that customers can purchase for full refund flexibility.

**How It Works**:
- Customer pays additional fee at booking time (e.g., $5-$20)
- Can cancel anytime before appointment for full refund
- Revenue split: 60% to platform, 40% to provider
- Overrides all other policy rules when purchased

**Example**:
```
Booking deposit: $100
Flex pass: $10
Total charge: $110

If customer cancels (even 1 hour before):
- Refund: $100 (full deposit)
- Platform keeps: $6 (60% of flex pass)
- Provider keeps: $4 (40% of flex pass)
```

### 5. No-Show Detection System (Phase 5 ✅)

**File**: `packages/api/src/lib/noShowDetection.ts`

Automatic detection and fee charging for customers who don't show up for appointments.

#### How It Works

1. **Hourly Automated Detection**: Worker job runs every hour (`0 * * * *` cron)
2. **2-Hour Grace Period**: Bookings 2+ hours past start time are eligible
3. **No-Show Fee**: Charges fee from policy snapshot (or full deposit as fallback)
4. **Notifications**: Sends emails to both customer and provider
5. **Manual Marking**: Providers can manually mark bookings as no-show via API

#### API Functions

```typescript
import {
  checkForNoShows,
  markAsNoShow,
  processNoShows,
  getNoShowStatistics,
} from '@/lib/noShowDetection';

// Find potential no-shows (2+ hours past booking time)
const potentialNoShows = await checkForNoShows();

// Mark booking as no-show (charges fee, sends notifications)
const updatedBooking = await markAsNoShow(bookingId, userId);

// Batch process all no-shows (hourly worker job)
const summary = await processNoShows();
// Returns: { totalFound, totalProcessed, totalFailed, errors }

// Get provider analytics
const stats = await getNoShowStatistics(providerId, startDate, endDate);
// Returns: { totalNoShows, totalFeesCharged, averageFee }
```

#### Worker Integration

**File**: `packages/api/src/worker.ts`

```typescript
import { processNoShowDetection, scheduleNoShowDetection } from './lib/bull.js';
import { processNoShows } from './lib/noShowDetection.js';

async function handleNoShowDetection(job: Job) {
  const summary = await processNoShows();
  console.log(`📊 No-show detection summary:`, {
    totalFound: summary.totalFound,
    totalProcessed: summary.totalProcessed,
    totalFailed: summary.totalFailed,
  });
}

// Register processor
await processNoShowDetection(handleNoShowDetection);

// Schedule recurring hourly job
await scheduleNoShowDetection();
```

#### Manual No-Show Endpoint

**Endpoint**: `POST /api/bookings/:id/no-show`

Providers can manually mark a booking as no-show:

```typescript
// packages/api/src/modules/bookings/bookings.controller.ts
router.post('/:id/no-show', requireAuth, async (req: AuthRequest, res, next) => {
  const booking = await bookingsService.markBookingAsNoShow(req.params.id, req.user!.id);
  res.json({ booking });
});
```

#### No-Show Fee Calculation

```typescript
import { calculateNoShowFee } from '@/lib/refundCalculator';

const fee = calculateNoShowFee(booking);
// Uses policy snapshot if available, otherwise full deposit
```

#### Test Coverage

**File**: `packages/api/src/lib/noShowDetection.test.ts`

- **checkForNoShows()**: 4 tests
  - Finds confirmed bookings past grace period
  - Excludes bookings within grace period
  - Excludes already-processed bookings
  - Returns bookings with service/user details
- **markAsNoShow()**: 8 tests
  - Marks booking and charges fee
  - Validates ownership (provider only)
  - Uses deposit as fallback when no policy snapshot
  - Sends notifications to customer and provider
  - Records who marked (system vs provider)
  - Error handling (booking not found, invalid status)
- **processNoShows()**: 3 tests
  - Batch processing with success count
  - Error handling (continues on failures)
  - Empty result handling
- **getNoShowStatistics()**: 3 tests
  - Calculates totals and averages
  - Handles null fees
  - Returns zero stats when empty

**Total**: 17 tests, all passing ✅

### 6. Flex Pass Payment Processing (Phase 6 ✅)

**Files**:
- `packages/api/src/lib/stripe.ts` - Payment intent creation with revenue splits
- `packages/api/src/modules/bookings/bookings.service.ts` - Booking creation with flex pass
- `packages/api/src/lib/flexPass.test.ts` - Comprehensive test suite

Optional cancellation protection that customers can purchase at checkout for guaranteed full refunds anytime.

#### How It Works

1. **Provider Configuration**: Provider enables flex pass for a service and sets price
2. **Customer Purchase**: Customer opts-in during booking checkout
3. **Payment Processing**: Total charge = deposit + flex pass fee
4. **Revenue Split**: Platform takes 60-70% of flex pass fee, provider gets 30-40%
5. **Refund Override**: Flex pass overrides ALL cancellation policies → full refund anytime

#### Revenue Split Architecture

**Stripe Connect Application Fees**:
- Total payment = Deposit + Flex Pass Fee
- Deposit platform fee: 2.5% of deposit (standard)
- Flex pass platform fee: 60-70% of flex pass price (configurable)
- Total application fee = Deposit fee + Flex pass fee
- Provider receives = Total payment - Application fees

**Example 1**: $100 deposit + $5 flex pass (60% platform)
```
Total charged: $105
Platform gets: $2.50 (2.5% deposit) + $3.00 (60% flex pass) = $5.50
Provider gets: $97.50 (deposit minus fee) + $2.00 (40% flex pass) = $99.50
```

**Example 2**: $50 deposit + $10 flex pass (70% platform)
```
Total charged: $60
Platform gets: $1.25 (2.5% deposit) + $7.00 (70% flex pass) = $8.25
Provider gets: $48.75 (deposit minus fee) + $3.00 (30% flex pass) = $51.75
```

#### API - Provider Configuration

Flex pass configuration is handled through the existing service update endpoint:

**Endpoint**: `PUT /api/services/:id`

```typescript
// Enable flex pass for a service
await axios.put('/api/services/service123', {
  flexPassEnabled: true,
  flexPassPrice: 500, // $5.00 in cents
  flexPassRevenueSharePercent: 60, // Platform gets 60%, provider gets 40%
});
```

#### API - Customer Purchase

**Endpoint**: `POST /api/bookings`

```typescript
// Create booking with flex pass purchase
const response = await axios.post('/api/bookings', {
  serviceId: 'service123',
  bookingDate: '2025-12-01T10:00:00Z',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+61400000000',
  depositAmount: 10000, // $100
  duration: 60,
  flexPassPurchased: true, // Customer opts-in to flex pass
});

// Returns payment intent with total amount (deposit + flex pass)
const { booking, clientSecret } = response.data;
// Total to charge: $105 ($100 deposit + $5 flex pass)
```

#### Payment Intent Creation

**File**: `packages/api/src/lib/stripe.ts`

```typescript
import { createPaymentIntent } from './lib/stripe';

const paymentIntent = await createPaymentIntent({
  amount: 10000, // Deposit in cents
  connectedAccountId: 'acct_provider123',
  flexPassFee: 500, // Flex pass fee in cents (optional)
  flexPassPlatformSharePercent: 60, // Platform's share (optional)
  metadata: {
    serviceId: 'service123',
    serviceName: 'Plumbing Service',
    flexPassPurchased: 'true',
  },
});

// Payment intent created with:
// - amount: 10500 ($105 total)
// - application_fee_amount: 550 ($2.50 deposit fee + $3.00 flex pass fee)
// - transfer_data.destination: provider's Stripe account
```

#### Revenue Split Logic

**File**: `packages/api/src/lib/refundCalculator.ts`

```typescript
import { calculateFlexPassSplit } from './lib/refundCalculator';

const split = calculateFlexPassSplit(500, 60); // $5 flex pass, 60% platform
// Returns:
// {
//   platformAmount: 300,        // $3.00 to platform
//   providerAmount: 200,        // $2.00 to provider
//   totalAmount: 500,           // $5.00 total
//   platformPercentage: 60,
//   providerPercentage: 40
// }
```

#### Booking Creation Flow

**File**: `packages/api/src/modules/bookings/bookings.service.ts`

```typescript
async function createBooking(data: NewBooking & { flexPassPurchased?: boolean }) {
  // 1. Get service and verify flex pass is available
  const service = await getService(data.serviceId);

  if (data.flexPassPurchased && !service.flexPassEnabled) {
    throw new Error('Flex pass not available for this service');
  }

  // 2. Calculate flex pass fee if purchased
  let flexPassFee = 0;
  if (data.flexPassPurchased && service.flexPassEnabled) {
    flexPassFee = service.flexPassPrice;
  }

  // 3. Create payment intent with flex pass
  const paymentIntent = await createPaymentIntent({
    amount: data.depositAmount,
    connectedAccountId: service.user.stripeAccountId,
    flexPassFee: data.flexPassPurchased ? flexPassFee : undefined,
    flexPassPlatformSharePercent: service.flexPassRevenueSharePercent,
  });

  // 4. Create booking with flex pass info
  const booking = await db.insert(bookings).values({
    ...data,
    stripePaymentIntentId: paymentIntent.id,
    flexPassPurchased: data.flexPassPurchased || false,
    flexPassFee: data.flexPassPurchased ? flexPassFee : null,
  });

  return { booking, clientSecret: paymentIntent.client_secret };
}
```

#### Refund Override

When a booking with flex pass is cancelled, the refund calculator automatically returns full refund:

```typescript
import { calculateRefundAmount } from './lib/refundCalculator';

const refundResult = calculateRefundAmount(booking, new Date());

if (booking.flexPassPurchased) {
  // Returns:
  // {
  //   refundAmount: 10000,  // Full deposit refunded
  //   feeCharged: 0,         // No fee
  //   reason: 'flex_pass_protection',
  //   explanation: 'Full refund due to cancellation protection purchased...'
  // }
}
```

**Note**: Flex pass fee itself is NOT refunded - customer paid for the protection and used it.

#### Test Coverage

**File**: `packages/api/src/lib/flexPass.test.ts`

- **Payment Intent - Without Flex Pass**: 2 tests
  - Creates payment intent with only deposit
  - Calculates correct platform fee (2.5%)
- **Payment Intent - With Flex Pass (60% platform)**: 3 tests
  - Adds flex pass fee to total amount
  - Calculates combined application fees
  - Adds flex pass metadata to payment intent
  - Defaults to 60% if not specified
- **Payment Intent - With Flex Pass (70% platform)**: 2 tests
  - Calculates correct fees with 70% split
  - Validates provider 30% share
- **Revenue Split Calculations**: 3 tests
  - $5 flex pass with 60% split
  - Edge case: $1 flex pass
  - Rounding behavior
- **Edge Cases**: 4 tests
  - Ignores flex pass if fee is 0
  - Ignores flex pass if fee is negative
  - Ignores flex pass if not provided
  - Handles large flex pass fees
- **Real-World Scenarios**: 3 tests
  - Plumber booking with flex pass ($50 + $5)
  - Dental appointment with flex pass ($100 + $10)
  - Legal consultation without flex pass ($200)

**Total**: 17 tests, all passing ✅

#### Configuration Examples

**Plumbing Service** (Encourage flex pass for emergencies):
```typescript
{
  flexPassEnabled: true,
  flexPassPrice: 500, // $5 for $50 deposit (10%)
  flexPassRevenueSharePercent: 60,
  cancellationWindowHours: 12, // Short window
  lateCancellationFee: 2500, // $25 late fee (50% of deposit)
}
```

**Dental Appointment** (Moderate flex pass):
```typescript
{
  flexPassEnabled: true,
  flexPassPrice: 1000, // $10 for $100 deposit (10%)
  flexPassRevenueSharePercent: 65,
  cancellationWindowHours: 24,
  lateCancellationFee: 5000, // $50 late fee
}
```

**Legal Consultation** (Premium flex pass):
```typescript
{
  flexPassEnabled: true,
  flexPassPrice: 2000, // $20 for $200 deposit (10%)
  flexPassRevenueSharePercent: 70,
  cancellationWindowHours: 48,
  lateCancellationFee: 10000, // $100 late fee
}
```

#### Frontend Integration (Pending - Phase 8)

**Provider Dashboard**:
- Toggle to enable/disable flex pass
- Input field for flex pass price
- Slider for revenue share (60-70%)
- Preview of customer cost and provider earnings

**Booking Widget**:
- Optional checkbox: "Add Cancellation Protection for $X"
- Clear explanation of benefits
- Updated total price display
- Payment element charges combined amount

### 7. Dispute Handling (Phase 7 ✅)

**Files**:
- `packages/api/src/modules/bookings/bookings.service.ts` - Dispute service methods
- `packages/api/src/modules/bookings/bookings.controller.ts` - REST API endpoints
- `packages/api/src/lib/queue.ts` - Dispute notification queues
- `packages/api/src/modules/bookings/disputes.test.ts` - Comprehensive test suite

Built-in workflow for handling customer disputes about cancellations, no-shows, and refund amounts.

#### How It Works

1. **Customer Creates Dispute**: Customer disputes a cancelled or no-show booking
2. **Validation**: System validates booking state and dispute eligibility
3. **Status Update**: Booking marked as `disputeStatus: 'pending'`
4. **Notifications Sent**: Both customer and provider receive dispute creation emails
5. **Admin Resolution**: Admin reviews and resolves in favor of customer or provider
6. **Refund Processing**: If customer wins, full deposit is automatically refunded via Stripe
7. **Final Notifications**: Both parties notified of resolution outcome

**Dispute State Machine**:
```
none → pending → resolved_customer (with refund)
                → resolved_provider (no refund)
```

**Dispute Eligibility**:
- Booking must be `cancelled` or `no_show` status
- Cannot dispute if already has `pending` or resolved dispute
- No time limit - disputes can be created anytime after cancellation/no-show

#### API Endpoints

**File**: `packages/api/src/modules/bookings/bookings.controller.ts`

##### Create Dispute (Customer)

**Endpoint**: `POST /api/bookings/:id/dispute`

**Authentication**: Required (customer must be booking owner)

**Request Body**:
```typescript
{
  reason: string; // Required, must be non-empty
}
```

**Example Request**:
```typescript
await axios.post('/api/bookings/booking123/dispute', {
  reason: 'I was charged a cancellation fee but I cancelled 48 hours in advance'
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Response**:
```typescript
{
  booking: {
    id: 'booking123',
    status: 'cancelled',
    disputeStatus: 'pending',
    disputeReason: 'I was charged a cancellation fee but...',
    disputeCreatedAt: '2025-11-15T10:30:00Z',
    // ... other booking fields
  }
}
```

**Validation Errors**:
- `400 Dispute reason is required` - Reason is missing or empty
- `404 Booking not found` - Invalid booking ID
- `400 Only cancelled or no-show bookings can be disputed` - Invalid booking state
- `400 This booking already has a pending dispute` - Duplicate dispute attempt
- `400 This booking dispute has already been resolved` - Already resolved

##### Resolve Dispute (Admin)

**Endpoint**: `POST /api/bookings/:id/dispute/resolve`

**Authentication**: Required (admin only - TODO: admin middleware)

**Request Body**:
```typescript
{
  resolution: 'customer' | 'provider'; // Required
  notes: string; // Optional admin notes
}
```

**Example Request**:
```typescript
// Resolve in customer's favor (issues full refund)
await axios.post('/api/bookings/booking123/dispute/resolve', {
  resolution: 'customer',
  notes: 'Customer provided proof they cancelled within window'
}, {
  headers: { Authorization: `Bearer ${adminToken}` }
});

// Resolve in provider's favor (no refund)
await axios.post('/api/bookings/booking123/dispute/resolve', {
  resolution: 'provider',
  notes: 'Provider policy clearly stated, customer cancelled too late'
}, {
  headers: { Authorization: `Bearer ${adminToken}` }
});
```

**Response (Customer Wins)**:
```typescript
{
  booking: {
    id: 'booking123',
    status: 'refunded', // Changed from 'cancelled'
    disputeStatus: 'resolved_customer',
    disputeResolvedAt: '2025-11-15T14:00:00Z',
    refundAmount: 10000, // Full deposit refunded
    refundReason: 'dispute_resolved_customer',
    // ... other booking fields
  }
}
```

**Response (Provider Wins)**:
```typescript
{
  booking: {
    id: 'booking123',
    status: 'cancelled', // Unchanged
    disputeStatus: 'resolved_provider',
    disputeResolvedAt: '2025-11-15T14:00:00Z',
    // No refund fields updated
  }
}
```

**Validation Errors**:
- `400 Resolution must be either "customer" or "provider"` - Invalid resolution value
- `404 Booking not found` - Invalid booking ID
- `400 No pending dispute found for this booking` - No active dispute
- `500 Failed to process refund for dispute resolution` - Stripe refund error

#### Service Methods

**File**: `packages/api/src/modules/bookings/bookings.service.ts`

##### createDispute()

```typescript
async createDispute(
  bookingId: string,
  userId: string,
  reason: string
): Promise<Booking>
```

**Purpose**: Create a dispute for a cancelled or no-show booking

**Process**:
1. Fetch booking with service and provider details
2. Validate booking state (must be `cancelled` or `no_show`)
3. Check for existing disputes (prevent duplicates)
4. Update booking with dispute info:
   - `disputeStatus: 'pending'`
   - `disputeReason: reason`
   - `disputeCreatedAt: new Date()`
5. Publish dispute creation notifications via queue
6. Return updated booking

**Error Handling**:
- Throws `AppError(404)` if booking not found
- Throws `AppError(400)` if booking not cancelled/no-show
- Throws `AppError(400)` if dispute already pending or resolved
- Gracefully handles email sending failures (logs error but doesn't fail)

##### resolveDispute()

```typescript
async resolveDispute(
  bookingId: string,
  adminUserId: string,
  resolution: 'customer' | 'provider',
  notes: string
): Promise<Booking>
```

**Purpose**: Resolve a pending dispute (admin only)

**Process**:
1. Fetch booking with service and provider details
2. Validate pending dispute exists
3. If `resolution === 'customer'`:
   - Process full refund via Stripe (`createRefund()`)
   - Update booking status to `refunded`
   - Set `refundAmount` to full deposit
   - Set `refundReason` to `'dispute_resolved_customer'`
4. If `resolution === 'provider'`:
   - No refund processed
   - Booking status unchanged
5. Update booking:
   - `disputeStatus: 'resolved_customer' | 'resolved_provider'`
   - `disputeResolvedAt: new Date()`
6. Publish dispute resolution notifications via queue
7. Return updated booking

**Error Handling**:
- Throws `AppError(404)` if booking not found
- Throws `AppError(400)` if no pending dispute
- Throws `AppError(500)` if Stripe refund fails
- Gracefully handles email sending failures (logs error but doesn't fail)

#### Queue Integration

**File**: `packages/api/src/lib/queue.ts`

##### Dispute Created Queue

**Queue**: `DISPUTE_CREATED`

**Publisher**:
```typescript
await queueService.publishDisputeCreated(
  bookingId: string,
  customerEmail: string,
  providerEmail: string,
  details: {
    serviceName: string;
    bookingDate: Date;
    disputeReason: string;
    customerName: string;
    providerName: string;
  }
);
```

**Message Format**:
```typescript
{
  bookingId: 'booking123',
  customerEmail: 'customer@example.com',
  providerEmail: 'provider@example.com',
  details: {
    serviceName: 'Plumbing Service',
    bookingDate: '2025-12-01T10:00:00Z',
    disputeReason: 'Unfair cancellation fee',
    customerName: 'John Doe',
    providerName: 'Jane Smith'
  },
  createdAt: '2025-11-15T10:30:00Z'
}
```

**Consumer**: Email worker (to be implemented)

##### Dispute Resolved Queue

**Queue**: `DISPUTE_RESOLVED`

**Publisher**:
```typescript
await queueService.publishDisputeResolved(
  bookingId: string,
  customerEmail: string,
  providerEmail: string,
  details: {
    serviceName: string;
    bookingDate: Date;
    resolution: 'customer' | 'provider';
    resolutionNotes: string;
    refundAmount: number;
    customerName: string;
    providerName: string;
  }
);
```

**Message Format**:
```typescript
{
  bookingId: 'booking123',
  customerEmail: 'customer@example.com',
  providerEmail: 'provider@example.com',
  details: {
    serviceName: 'Plumbing Service',
    bookingDate: '2025-12-01T10:00:00Z',
    resolution: 'customer',
    resolutionNotes: 'Customer was right',
    refundAmount: 10000, // $100.00 (0 if provider wins)
    customerName: 'John Doe',
    providerName: 'Jane Smith'
  },
  createdAt: '2025-11-15T14:00:00Z'
}
```

**Consumer**: Email worker (to be implemented)

#### Test Coverage

**File**: `packages/api/src/modules/bookings/disputes.test.ts`

- **createDispute()**: 7 tests
  - ✅ Creates dispute for cancelled booking
  - ✅ Creates dispute for no-show booking
  - ✅ Throws error if booking not found
  - ✅ Throws error if booking not cancelled/no-show
  - ✅ Throws error if dispute already pending
  - ✅ Throws error if dispute already resolved
  - ✅ Continues if email sending fails (graceful degradation)
- **resolveDispute()**: 7 tests
  - ✅ Resolves in customer favor with full refund
  - ✅ Resolves in provider favor without refund
  - ✅ Throws error if booking not found
  - ✅ Throws error if no pending dispute
  - ✅ Throws error if refund processing fails
  - ✅ Handles no-show dispute resolved for customer
  - ✅ Continues if email sending fails (graceful degradation)

**Total**: 14 tests, all passing ✅

#### Example Scenarios

**Scenario 1**: Customer disputes unfair late cancellation fee
```typescript
// Customer cancelled 30 hours before appointment
// Service policy: 24-hour cancellation window, $25 late fee
// Customer was charged $25 fee

// 1. Customer creates dispute
await axios.post('/api/bookings/booking123/dispute', {
  reason: 'I cancelled 30 hours in advance but was still charged a late fee'
});

// 2. Admin reviews
// - Booking time: Dec 1, 10:00 AM
// - Cancellation time: Nov 29, 4:00 PM (30 hours before)
// - Policy: 24-hour window
// - Customer is correct - should have gotten free cancellation

// 3. Admin resolves in customer favor
await axios.post('/api/bookings/booking123/dispute/resolve', {
  resolution: 'customer',
  notes: 'Customer cancelled 30 hours in advance, within the 24-hour window'
});

// Result:
// - Status changed to 'refunded'
// - Full $100 deposit refunded via Stripe
// - Both parties notified via email
```

**Scenario 2**: Customer disputes no-show fee (provider wins)
```typescript
// Customer marked as no-show
// Customer claims they arrived but provider was closed

// 1. Customer creates dispute
await axios.post('/api/bookings/booking456/dispute', {
  reason: 'I showed up but the shop was closed. This is unfair.'
});

// 2. Admin reviews
// - Provider provided security camera footage showing shop was open
// - Customer never arrived
// - No-show fee is justified

// 3. Admin resolves in provider favor
await axios.post('/api/bookings/booking456/dispute/resolve', {
  resolution: 'provider',
  notes: 'Provider provided evidence that shop was open. Customer did not arrive.'
});

// Result:
// - Status remains 'no_show'
// - No refund processed
// - Provider keeps the no-show fee
// - Both parties notified via email
```

#### Database Fields Used

**Bookings Table**:
- `disputeStatus`: `'none' | 'pending' | 'resolved_customer' | 'resolved_provider'`
- `disputeReason`: `TEXT` - Customer's explanation for the dispute
- `disputeCreatedAt`: `TIMESTAMP` - When dispute was created
- `disputeResolvedAt`: `TIMESTAMP` - When dispute was resolved

**Status Changes**:
- Create dispute: No status change (remains `cancelled` or `no_show`)
- Resolve for customer: Status → `refunded`, `refundAmount` updated
- Resolve for provider: No status change

#### Email Templates (Phase 7.2 ✅)

**Files**:
- `packages/api/src/emails/dispute-created.tsx` - Dual-purpose template for customer and provider
- `packages/api/src/emails/dispute-resolved.tsx` - Dual-purpose template for customer and provider
- `packages/api/src/worker.ts` - Worker handlers for dispute notification queues

Both email templates support `recipientType: 'customer' | 'provider'` to customize content for each recipient.

**Worker Handlers**:
- `handleDisputeCreated()` - Sends dispute creation emails to both customer and provider
- `handleDisputeResolved()` - Sends resolution emails to both parties with outcome details

**Queue Consumers** (registered in worker startup):
- `DISPUTE_CREATED` queue - Processes dispute creation notifications
- `DISPUTE_RESOLVED` queue - Processes dispute resolution notifications

**Next Steps (Pending)**:

**Admin Dashboard** (Phase 8):
- View all pending disputes
- Filter by booking status, date range, service
- One-click resolution with notes field
- Dispute history and analytics

## Database Schema

### Services Table - Policy Fields

```sql
-- Cancellation Policy
cancellation_window_hours INTEGER DEFAULT 24,
late_cancellation_fee INTEGER,  -- cents
no_show_fee INTEGER,  -- cents
allow_partial_refunds BOOLEAN DEFAULT true,
auto_refund_on_cancel BOOLEAN DEFAULT true,
minimum_cancellation_hours INTEGER DEFAULT 2,

-- Flex Pass
flex_pass_enabled BOOLEAN DEFAULT false,
flex_pass_price INTEGER,  -- cents
flex_pass_revenue_share_percent INTEGER DEFAULT 60,
flex_pass_rules_json JSONB,

-- Protection Addons
protection_addons JSONB
```

### Bookings Table - Tracking Fields

```sql
-- Cancellation & Refunds
cancellation_time TIMESTAMP,
cancellation_reason TEXT,
refund_amount INTEGER,  -- cents
refund_reason TEXT,
fee_charged INTEGER,  -- cents

-- Flex Pass
flex_pass_purchased BOOLEAN DEFAULT false,
flex_pass_fee INTEGER,  -- cents

-- Policy Snapshot (CRITICAL)
policy_snapshot_json JSONB,

-- Disputes
dispute_status TEXT DEFAULT 'none',
dispute_reason TEXT,
dispute_created_at TIMESTAMP,
dispute_resolved_at TIMESTAMP
```

## Implementation Examples

### Example 1: Configure Service Policy

```typescript
// Dashboard - Policy Settings
await updateServicePolicy(serviceId, {
  cancellationWindowHours: 48,
  lateCancellationFee: 4000, // $40.00
  noShowFee: 8000, // $80.00
  allowPartialRefunds: true,
  autoRefundOnCancel: true,
  flexPassEnabled: true,
  flexPassPrice: 1000, // $10.00
  flexPassRevenueSharePercent: 60,
});
```

### Example 2: Customer Cancels Booking

```typescript
// Customer cancels 12 hours before appointment
const booking = await getBooking(bookingId);
const policy = getPolicyFromSnapshot(booking);

// Calculate refund
const hoursUntilBooking = differenceInHours(
  new Date(booking.bookingDate),
  new Date()
);

if (hoursUntilBooking >= policy.cancellationWindowHours) {
  // Full refund
  refund = booking.depositAmount;
  fee = 0;
} else if (hoursUntilBooking >= policy.minimumCancellationHours) {
  // Partial refund with late fee
  fee = policy.lateCancellationFee || 0;
  refund = booking.depositAmount - fee;
} else {
  // No refund - too close to appointment
  refund = 0;
  fee = booking.depositAmount;
}

// Process refund
await createRefund({
  bookingId: booking.id,
  amount: refund,
  reason: 'customer_cancellation',
});

// Update booking
await updateBooking(bookingId, {
  status: 'cancelled',
  cancellationTime: new Date(),
  refundAmount: refund,
  feeCharged: fee,
});
```

### Example 3: Flex Pass Override

```typescript
// Customer purchased flex pass - full refund regardless of timing
if (booking.flexPassPurchased) {
  return {
    refundAmount: booking.depositAmount,
    feeCharged: 0,
    reason: 'flex_pass_protection',
    explanation: 'Full refund due to cancellation protection purchased',
  };
}
```

## Testing

Comprehensive test coverage ensures system integrity:

### Policy Snapshot Tests
**Test File**: `packages/api/src/lib/policySnapshot.test.ts`

**Coverage** (21 tests ✅):
- ✅ Snapshot creation with various configurations
- ✅ Default value handling
- ✅ Validation and error handling
- ✅ Policy immutability guarantees
- ✅ Edge cases (percentage deposits, complex addons)

### Refund Calculator Tests
**Test File**: `packages/api/src/lib/refundCalculator.test.ts`

**Coverage** (34 tests ✅):
- ✅ Full refunds within cancellation window
- ✅ Partial refunds with late cancellation fees
- ✅ No refunds for last-minute cancellations
- ✅ Flex pass override scenarios
- ✅ Already-refunded booking detection
- ✅ No-show fee calculations
- ✅ Flex pass revenue splits (60/40, 70/30)
- ✅ Validation edge cases
- ✅ Timezone handling
- ✅ Real-world scenarios (plumber, dental, last-minute)

**Run Tests**:
```bash
cd packages/api
npm test -- policySnapshot.test.ts
npm test -- refundCalculator.test.ts
npm test -- noShowDetection.test.ts
npm test -- flexPass.test.ts
npm test -- disputes.test.ts
```

**Total: 103 tests, 100% passing** ✅
- Policy Snapshot: 21 tests
- Refund Calculator: 34 tests
- No-Show Detection: 17 tests
- Flex Pass Payment Processing: 17 tests
- Dispute Handling: 14 tests

## Critical Implementation Rules

### ⚠️ ALWAYS Use Policy Snapshot

```typescript
// ❌ WRONG - uses current service policy
const service = await getService(booking.serviceId);
const refund = calculateRefund(service, booking);

// ✅ CORRECT - uses booking-time policy
const policy = getPolicyFromSnapshot(booking);
const refund = calculateRefund(policy, booking);
```

### ⚠️ Validate Refund Amounts

```typescript
// Never refund more than the deposit
const maxRefund = booking.depositAmount;
if (calculatedRefund > maxRefund) {
  throw new Error('Refund cannot exceed deposit amount');
}
```

### ⚠️ Handle Timezones Correctly

```typescript
import { formatInTimeZone } from 'date-fns-tz';

// Always convert booking date to user's timezone
const bookingInUserTz = formatInTimeZone(
  booking.bookingDate,
  user.timezone,
  'yyyy-MM-dd HH:mm:ss'
);
```

## Roadmap

- [x] **Phase 1**: Terminology cleanup (Week 1) ✅
- [x] **Phase 2**: Database schema - policy fields (Week 2) ✅
- [x] **Phase 3**: Policy snapshot system (Week 3) ✅
- [x] **Phase 4**: Refund calculation engine (Week 3-4) ✅
- [x] **Phase 5**: No-show detection with hourly worker (Week 4) ✅
- [x] **Phase 6**: Flex pass payment processing (Week 5) ✅
- [x] **Phase 7**: Dispute handling (Week 5) ✅
- [ ] **Phase 8**: Dashboard UI & Widget integration (Week 6)
- [ ] **Phase 9**: Industry defaults (Week 6)
- [ ] **Phase 10**: Protection addons (Week 7)

**Next Phase**: Phase 8 (Dashboard UI & Widget integration)

## Related Documentation

- [Database Schema](../architecture/03-database-schema.md)
- [Policy Snapshot Implementation](../../packages/api/src/lib/policySnapshot.ts)
- [Refund Policy Overview](../refund-policy.md)
- [Multi-Vertical Implementation Plan](../../TODO-MULTI-VERTICAL-REFUND-SYSTEM.md)

## Support

For questions or issues with the refund policy system:

1. Check test cases in `policySnapshot.test.ts` for usage examples
2. Review policy snapshot validation errors in application logs
3. Verify database schema matches expected structure
4. Ensure booking has a valid policy snapshot before refund calculation

---

**Last Updated**: 2025-11-15
**Status**: Phase 7 Complete (Dispute Handling)
**Next Phase**: Dashboard UI & Widget Integration (Phase 8)
