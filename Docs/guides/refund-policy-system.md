# Refund Policy System

> **Implementation Status**: Phase 4 Complete (Refund Calculation Engine)
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
- ⏳ **No-Show Detection** - Automatic detection and fee charging (Phase 5)
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

### 5. No-Show Detection (Phase 5 - Coming Soon)

Automatic detection of no-shows with grace period:

```typescript
// Runs hourly via worker
async function checkForNoShows() {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  const noShows = await db.query.bookings.findMany({
    where: and(
      eq(bookings.status, 'confirmed'),
      lt(bookings.bookingDate, cutoff)
    )
  });

  for (const booking of noShows) {
    await markAsNoShow(booking);
  }
}
```

### 6. Dispute Resolution (Phase 7 - Coming Soon)

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
```

**Total: 55 tests, 100% passing** ✅

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
- [ ] **Phase 5**: No-show detection (Week 4)
- [ ] **Phase 6**: Flex pass implementation (Week 5)
- [ ] **Phase 7**: Dispute handling (Week 5)
- [ ] **Phase 8**: Dashboard UI (Week 6)
- [ ] **Phase 9**: Industry defaults (Week 6)
- [ ] **Phase 10**: Protection addons (Week 7)

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
