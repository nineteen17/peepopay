import { Router, Request, Response } from 'express';
import { WebhooksService } from './webhooks.service.js';
import { createQueueService } from '../../lib/queue.js';

const router = Router();
const webhooksService = new WebhooksService();

/**
 * Webhooks Controller
 * Handles webhook HTTP requests (Stripe)
 */

// Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    // Verify and construct webhook event
    const event = webhooksService.verifyStripeWebhook(req.body, sig);

    // Publish event to queue for async processing
    const queueService = createQueueService();
    await queueService.publishStripeWebhook(event);

    // Acknowledge receipt immediately
    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
