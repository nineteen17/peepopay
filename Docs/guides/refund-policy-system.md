# Refund Policy System

> **Implementation Status**: Phase 6 Complete (Flex Pass Payment Processing)
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
- ⏳ **Dispute Resolution** - Built-in dispute handling workflow (Phase 7)
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

### 7. Dispute Resolution (Phase 7 - Coming Soon)

Built-in workflow for handling customer disputes:

**Dispute Lifecycle**:
```
none → pending → resolved_customer | resolved_provider
```

**Endpoints**:
- `POST /api/bookings/:id/dispute` - Create dispute
- `POST /api/bookings/:id/dispute/resolve` - Resolve dispute (admin only)

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
```

**Total: 89 tests, 100% passing** ✅
- Policy Snapshot: 21 tests
- Refund Calculator: 34 tests
- No-Show Detection: 17 tests
- Flex Pass Payment Processing: 17 tests

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
- [ ] **Phase 7**: Dispute handling (Week 5)
- [ ] **Phase 8**: Dashboard UI & Widget integration (Week 6)
- [ ] **Phase 9**: Industry defaults (Week 6)
- [ ] **Phase 10**: Protection addons (Week 7)

**Next Phase**: Phase 7 (Dispute Handling) or Phase 8 (Dashboard UI & Widget integration)

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
**Status**: Phase 4 Complete
**Next Phase**: No-Show Detection System (Phase 5)
