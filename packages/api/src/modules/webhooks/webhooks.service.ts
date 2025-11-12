import { BookingsService } from '../bookings/bookings.service.js';
import { UsersService } from '../users/users.service.js';
import { constructWebhookEvent } from '../../lib/stripe.js';
import { config } from '../../config/index.js';

/**
 * Webhooks Service
 * Handles webhook-related business logic
 */
export class WebhooksService {
  private bookingsService: BookingsService;
  private usersService: UsersService;

  constructor() {
    this.bookingsService = new BookingsService();
    this.usersService = new UsersService();
  }

  /**
   * Verify and construct Stripe webhook event
   */
  verifyStripeWebhook(payload: string | Buffer, signature: string) {
    return constructWebhookEvent(payload, signature, config.stripe.webhookSecret);
  }

  /**
   * Handle payment succeeded event
   */
  async handlePaymentSucceeded(paymentIntent: any) {
    const updated = await this.bookingsService.confirmPayment(
      paymentIntent.id,
      paymentIntent.latest_charge as string
    );

    console.log('Payment succeeded for booking:', updated?.id);
    return updated;
  }

  /**
   * Handle payment failed event
   */
  async handlePaymentFailed(paymentIntent: any) {
    await this.bookingsService.handleFailedPayment(paymentIntent.id);
    console.log('Payment failed for payment intent:', paymentIntent.id);
  }

  /**
   * Handle Stripe account updated event
   */
  async handleAccountUpdated(account: any) {
    console.log('Stripe account updated:', account.id);

    // Sync account onboarding status with database
    try {
      await this.usersService.syncStripeAccountStatus(account.id);
    } catch (error) {
      console.error('Error syncing Stripe account status:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Process Stripe webhook event
   */
  async processStripeEvent(event: any) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return await this.handlePaymentSucceeded(event.data.object);

      case 'payment_intent.payment_failed':
        return await this.handlePaymentFailed(event.data.object);

      case 'account.updated':
        return await this.handleAccountUpdated(event.data.object);

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return null;
    }
  }
}
