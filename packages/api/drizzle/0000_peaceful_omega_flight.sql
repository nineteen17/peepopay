CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_start" time,
	"break_end" time,
	"slot_duration" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"reason" text,
	"is_recurring" text DEFAULT 'false',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_address" text,
	"booking_date" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"notes" text,
	"deposit_amount" integer NOT NULL,
	"deposit_status" text DEFAULT 'pending' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"cancellation_time" timestamp,
	"cancellation_reason" text,
	"refund_amount" integer,
	"refund_reason" text,
	"fee_charged" integer,
	"flex_pass_purchased" boolean DEFAULT false,
	"flex_pass_fee" integer,
	"policy_snapshot_json" jsonb,
	"dispute_status" text DEFAULT 'none' NOT NULL,
	"dispute_reason" text,
	"dispute_created_at" timestamp,
	"dispute_resolved_at" timestamp,
	"vertical_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"name" text NOT NULL,
	"business_name" text,
	"slug" text NOT NULL,
	"stripe_account_id" text,
	"stripe_onboarded" boolean DEFAULT false,
	"stripe_fee_percentage" text DEFAULT '2.5',
	"password_hash" text,
	"phone" text,
	"avatar" text,
	"timezone" text DEFAULT 'Australia/Sydney',
	"industry_vertical" text DEFAULT 'general',
	"industry_subcategory" text,
	"vertical_tier" text DEFAULT 'core',
	"enabled_features" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_slug_unique" UNIQUE("slug"),
	CONSTRAINT "users_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"deposit_amount" integer NOT NULL,
	"deposit_type" text DEFAULT 'fixed' NOT NULL,
	"deposit_percentage" integer,
	"full_price" integer,
	"is_active" boolean DEFAULT true,
	"requires_approval" boolean DEFAULT false,
	"cancellation_window_hours" integer DEFAULT 24,
	"late_cancellation_fee" integer,
	"no_show_fee" integer,
	"allow_partial_refunds" boolean DEFAULT true,
	"auto_refund_on_cancel" boolean DEFAULT true,
	"minimum_cancellation_hours" integer DEFAULT 2,
	"flex_pass_enabled" boolean DEFAULT false,
	"flex_pass_price" integer,
	"flex_pass_revenue_share_percent" integer DEFAULT 60,
	"flex_pass_rules_json" jsonb,
	"protection_addons" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;