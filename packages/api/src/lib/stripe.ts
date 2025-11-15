import Stripe from 'stripe';
import { config } from '../config/index.js';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
});

/**
 * Create a Stripe Connect account for a provider
 */
export async function createConnectAccount(params: {
  email: string;
  businessName?: string;
  country?: string;
}) {
  const account = await stripe.accounts.create({
    type: 'express',
    email: params.email,
    business_type: 'individual',
    country: params.country || 'AU',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: params.businessName,
    },
  });

  return account;
}

/**
 * Create an account link for Stripe Connect onboarding
 */
export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Create a payment intent for booking deposit
 */
export async function createPaymentIntent(params: {
  amount: number; // in cents
  currency?: string;
  connectedAccountId: string;
  customerId?: string;
  metadata?: Record<string, string>;
}) {
  const platformFee = Math.round(params.amount * 0.025); // 2.5% platform fee

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'aud',
    customer: params.customerId,
    application_fee_amount: platformFee,
    transfer_data: {
      destination: params.connectedAccountId,
    },
    metadata: params.metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

/**
 * Retrieve account details
 */
export async function getAccountDetails(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return account;
}

/**
 * Check if account is fully onboarded
 */
export async function isAccountOnboarded(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId);
  return account.charges_enabled && account.payouts_enabled;
}

/**
 * Create a refund with support for partial refunds and metadata
 *
 * @param params - Refund parameters
 * @returns Stripe refund object
 *
 * @example
 * // Full refund
 * const refund = await createRefund({
 *   paymentIntentId: 'pi_xxx',
 *   metadata: { bookingId: 'xxx', reason: 'within_window' }
 * });
 *
 * // Partial refund
 * const refund = await createRefund({
 *   paymentIntentId: 'pi_xxx',
 *   amount: 5000, // $50.00
 *   metadata: {
 *     bookingId: 'xxx',
 *     reason: 'late_cancellation',
 *     feeCharged: '3000',
 *     refundAmount: '5000'
 *   }
 * });
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // Optional amount for partial refunds (in cents)
  reason?: string; // Refund reason code
  metadata?: Record<string, string>; // Additional metadata for tracking
}) {
  // Validate payment intent ID
  if (!params.paymentIntentId || !params.paymentIntentId.startsWith('pi_')) {
    throw new Error('Invalid payment intent ID');
  }

  // Validate amount if provided
  if (params.amount !== undefined && params.amount < 0) {
    throw new Error('Refund amount cannot be negative');
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount, // If undefined, Stripe will refund the full amount
      reason: params.reason as Stripe.RefundCreateParams.Reason | undefined,
      metadata: {
        ...params.metadata,
        refundedAt: new Date().toISOString(),
      },
    });

    return refund;
  } catch (error) {
    // Enhanced error handling
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe refund error:', {
        type: error.type,
        code: error.code,
        message: error.message,
        paymentIntentId: params.paymentIntentId,
      });
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Construct webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
) {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
