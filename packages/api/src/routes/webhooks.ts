import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { bookings } from '../db/schema/index.js';
import { constructWebhookEvent } from '../lib/stripe.js';
import { config } from '../config/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    // Get raw body for signature verification
    const event = constructWebhookEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;

        // Update booking status
        const [updated] = await db
          .update(bookings)
          .set({
            status: 'confirmed',
            stripeChargeId: paymentIntent.latest_charge as string,
            updatedAt: new Date(),
          })
          .where(eq(bookings.stripePaymentIntentId, paymentIntent.id))
          .returning();

        console.log('Payment succeeded for booking:', updated?.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;

        // Update booking status
        await db
          .update(bookings)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(bookings.stripePaymentIntentId, paymentIntent.id));

        console.log('Payment failed for payment intent:', paymentIntent.id);
        break;
      }

      case 'account.updated': {
        const account = event.data.object;
        console.log('Stripe account updated:', account.id);
        // Update user's Stripe onboarding status if needed
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
