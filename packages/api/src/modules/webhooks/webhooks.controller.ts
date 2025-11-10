import { Router, Request, Response } from 'express';
import { WebhooksService } from './webhooks.service.js';
import { QueueService } from '../../lib/queue.js';

const router = Router();
const webhooksService = new WebhooksService();
const queueService = new QueueService();

/**
 * Webhooks Controller
 * Handles webhook HTTP requests (Stripe)
 */

// Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    // Verify and construct webhook event
    const event = webhooksService.verifyStripeWebhook(req.body, sig);

    // Publish event to queue for async processing
    await queueService.publishStripeWebhook(event.id, event.type, event.data);

    // Acknowledge receipt immediately
    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
