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
 * Create a refund
 */
export async function createRefund(paymentIntentId: string, amount?: number) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
  });

  return refund;
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
