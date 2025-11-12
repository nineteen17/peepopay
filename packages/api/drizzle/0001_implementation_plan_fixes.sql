-- Migration: Implementation Plan Fixes
-- Date: 2025-11-12
-- Description: Adds missing fields and indexes per implementation plan

-- =============================================
-- 1. Services Table Updates
-- =============================================

-- Add depositType column to services table
ALTER TABLE "services"
ADD COLUMN IF NOT EXISTS "deposit_type" text DEFAULT 'fixed' NOT NULL;

-- Add constraint for depositType enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_deposit_type_check'
  ) THEN
    ALTER TABLE "services"
    ADD CONSTRAINT "services_deposit_type_check"
    CHECK ("deposit_type" IN ('percentage', 'fixed'));
  END IF;
END $$;

-- Update comments
COMMENT ON COLUMN "services"."deposit_amount" IS 'Amount in cents (or percentage if depositType is percentage)';
COMMENT ON COLUMN "services"."deposit_type" IS 'Type of deposit: fixed amount or percentage';

-- =============================================
-- 2. Bookings Table Updates
-- =============================================

-- Add depositStatus column to bookings table
ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "deposit_status" text DEFAULT 'pending' NOT NULL;

-- Add constraint for depositStatus enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_deposit_status_check'
  ) THEN
    ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_deposit_status_check"
    CHECK ("deposit_status" IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

-- Make customerPhone NOT NULL (add default empty string temporarily if needed)
UPDATE "bookings" SET "customer_phone" = '' WHERE "customer_phone" IS NULL;
ALTER TABLE "bookings"
ALTER COLUMN "customer_phone" SET NOT NULL;

-- Add customerAddress column
ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "customer_address" text;

-- Update comments
COMMENT ON COLUMN "bookings"."deposit_status" IS 'Status of the deposit payment';
COMMENT ON COLUMN "bookings"."customer_phone" IS 'Customer phone number (required)';
COMMENT ON COLUMN "bookings"."customer_address" IS 'Customer address (optional)';

-- =============================================
-- 3. Performance Indexes
-- =============================================

-- Index for availability queries by user and day
CREATE INDEX IF NOT EXISTS "idx_availability_user_day"
ON "availability"("user_id", "day_of_week");

-- Index for blocked slots queries
CREATE INDEX IF NOT EXISTS "idx_blocked_slots_user_date"
ON "blocked_slots"("user_id", "start_time", "end_time");

-- Index for booking queries by user and date
CREATE INDEX IF NOT EXISTS "idx_bookings_user_date"
ON "bookings"("user_id", "booking_date");

-- Index for booking status queries
CREATE INDEX IF NOT EXISTS "idx_bookings_status"
ON "bookings"("status");

-- Index for booking payment intent lookups
CREATE INDEX IF NOT EXISTS "idx_bookings_payment_intent"
ON "bookings"("stripe_payment_intent_id");

-- Index for service queries by user
CREATE INDEX IF NOT EXISTS "idx_services_user_active"
ON "services"("user_id", "is_active");

-- Index for user slug lookups (if not already indexed)
CREATE INDEX IF NOT EXISTS "idx_users_slug"
ON "users"("slug");

-- =============================================
-- 4. Data Consistency Updates
-- =============================================

-- Set default depositStatus for existing bookings based on their status
UPDATE "bookings"
SET "deposit_status" = 'paid'
WHERE "status" = 'confirmed' AND "deposit_status" = 'pending';

UPDATE "bookings"
SET "deposit_status" = 'failed'
WHERE "status" = 'cancelled' AND "deposit_status" = 'pending';

-- =============================================
-- Migration Complete
-- =============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 0001_implementation_plan_fixes completed successfully';
END $$;
