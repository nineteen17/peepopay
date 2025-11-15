import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config/index.js';

let connection: Connection | null = null;
let channel: Channel | null = null;

export const QUEUES = {
  EMAIL_NOTIFICATIONS: 'email_notifications',
  BOOKING_CONFIRMATIONS: 'booking_confirmations',
  BOOKING_CANCELLATIONS: 'booking_cancellations',
  BOOKING_COMPLETIONS: 'booking_completions',
  NO_SHOW_NOTIFICATIONS: 'no_show_notifications',
  REFUND_NOTIFICATIONS: 'refund_notifications',
  DISPUTE_CREATED: 'dispute_created',
  DISPUTE_RESOLVED: 'dispute_resolved',
  PAYMENT_FAILURES: 'payment_failures',
  STRIPE_WEBHOOKS: 'stripe_webhooks',
  AUTH_EMAILS: 'auth_emails', // Auth-related emails (welcome, verification, password reset)
  FAILED_JOBS: 'failed_jobs', // Dead letter queue
} as const;

export async function initRabbitMQ(): Promise<void> {
  try {
    // Create connection
    const conn = await amqp.connect(config.rabbitmqUrl);
    connection = conn as unknown as Connection;
    console.log('✅ RabbitMQ connected');

    conn.on('error', (err: Error) => {
      console.error('RabbitMQ Connection Error:', err);
    });

    conn.on('close', () => {
      console.log('RabbitMQ connection closed');
    });

    // Create channel
    channel = await conn.createChannel();
    console.log('✅ RabbitMQ channel created');

    // Assert queues with dead letter exchange
    await assertQueues();
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
    throw error;
  }
}

async function assertQueues(): Promise<void> {
  if (!channel) throw new Error('Channel not initialized');

  // Dead letter exchange
  await channel.assertExchange('dlx', 'direct', { durable: true });

  // Assert all queues
  for (const queueName of Object.values(QUEUES)) {
    const isDeadLetter = queueName === QUEUES.FAILED_JOBS;

    await channel.assertQueue(queueName, {
      durable: true,
      ...(isDeadLetter
        ? {}
        : {
            deadLetterExchange: 'dlx',
            deadLetterRoutingKey: QUEUES.FAILED_JOBS,
          }),
    });

    // Bind dead letter queue
    if (isDeadLetter) {
      await channel.bindQueue(queueName, 'dlx', queueName);
    }

    console.log(`✅ Queue asserted: ${queueName}`);
  }
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call initRabbitMQ() first.');
  }
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await (connection as any).close();
      connection = null;
    }
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ:', error);
  }
}

// Queue Service for publishing messages
export class QueueService {
  private channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async publish(queue: string, message: any, options?: { priority?: number; delay?: number }): Promise<void> {
    try {
      const content = Buffer.from(JSON.stringify(message));

      const publishOptions: any = {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      };

      if (options?.priority) {
        publishOptions.priority = options.priority;
      }

      if (options?.delay) {
        // Delayed messages require a plugin or separate delayed queue
        publishOptions.headers = {
          'x-delay': options.delay,
        };
      }

      this.channel.sendToQueue(queue, content, publishOptions);
      console.log(`📤 Message published to queue: ${queue}`);
    } catch (error) {
      console.error(`Failed to publish to queue ${queue}:`, error);
      throw error;
    }
  }

  async publishEmailNotification(to: string, subject: string, body: string): Promise<void> {
    await this.publish(QUEUES.EMAIL_NOTIFICATIONS, {
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
    });
  }

  async publishBookingConfirmation(bookingId: string, customerEmail: string, details: any): Promise<void> {
    await this.publish(QUEUES.BOOKING_CONFIRMATIONS, {
      bookingId,
      customerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishBookingCancellation(
    bookingId: string,
    customerEmail: string,
    providerEmail: string,
    details: {
      serviceName: string;
      duration: number;
      price: number;
      customerName: string;
      providerName: string;
      bookingDate: Date;
      refundAmount?: number;
    }
  ): Promise<void> {
    await this.publish(QUEUES.BOOKING_CANCELLATIONS, {
      bookingId,
      customerEmail,
      providerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishNoShowNotification(
    bookingId: string,
    customerEmail: string,
    providerEmail: string,
    details: {
      serviceName: string;
      bookingDate: Date;
      feeCharged: number;
      customerName: string;
      providerName: string;
    }
  ): Promise<void> {
    await this.publish(QUEUES.NO_SHOW_NOTIFICATIONS, {
      bookingId,
      customerEmail,
      providerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishRefundNotification(
    bookingId: string,
    customerEmail: string,
    details: {
      serviceName: string;
      bookingDate: Date;
      refundAmount: number;
      cancellationReason: string;
      customerName: string;
    }
  ): Promise<void> {
    await this.publish(QUEUES.REFUND_NOTIFICATIONS, {
      bookingId,
      customerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishStripeWebhook(event: any): Promise<void> {
    await this.publish(QUEUES.STRIPE_WEBHOOKS, {
      eventId: event.id,
      eventType: event.type,
      data: event.data,
      receivedAt: new Date().toISOString(),
    });
  }

  async publishAuthEmail(
    type: 'welcome' | 'verification' | 'password-reset' | 'password-changed',
    to: string,
    data: any
  ): Promise<void> {
    await this.publish(QUEUES.AUTH_EMAILS, {
      type,
      to,
      data,
      createdAt: new Date().toISOString(),
    });
  }

  async publishPaymentFailure(
    bookingId: string,
    customerEmail: string,
    details: {
      serviceName: string;
      customerName: string;
      bookingDate: Date;
      amount: number;
      failureReason?: string;
    }
  ): Promise<void> {
    await this.publish(QUEUES.PAYMENT_FAILURES, {
      bookingId,
      customerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishBookingCompletion(
    bookingId: string,
    customerEmail: string,
    providerEmail: string,
    details: {
      serviceName: string;
      duration: number;
      price: number;
      customerName: string;
      providerName: string;
      bookingDate: Date;
    }
  ): Promise<void> {
    await this.publish(QUEUES.BOOKING_COMPLETIONS, {
      bookingId,
      customerEmail,
      providerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishDisputeCreated(
    bookingId: string,
    customerEmail: string,
    providerEmail: string,
    details: {
      serviceName: string;
      bookingDate: Date;
      disputeReason: string;
      customerName: string;
      providerName: string;
    }
  ): Promise<void> {
    await this.publish(QUEUES.DISPUTE_CREATED, {
      bookingId,
      customerEmail,
      providerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  async publishDisputeResolved(
    bookingId: string,
    customerEmail: string,
    providerEmail: string,
    details: {
      serviceName: string;
      bookingDate: Date;
      resolution: 'customer' | 'provider';
      resolutionNotes: string;
      refundAmount: number;
      customerName: string;
      providerName: string;
    }
  ): Promise<void> {
    await this.publish(QUEUES.DISPUTE_RESOLVED, {
      bookingId,
      customerEmail,
      providerEmail,
      details,
      createdAt: new Date().toISOString(),
    });
  }
}

export function createQueueService(): QueueService {
  return new QueueService(getChannel());
}

// Consumer function for workers
export async function consumeQueue(
  queue: string,
  handler: (message: any) => Promise<void>,
  options?: { prefetch?: number }
): Promise<void> {
  const ch = getChannel();

  // Set prefetch count (how many messages to process at once)
  await ch.prefetch(options?.prefetch || 1);

  console.log(`👂 Waiting for messages in queue: ${queue}`);

  await ch.consume(
    queue,
    async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`📥 Received message from ${queue}:`, content);

        await handler(content);

        // Acknowledge message
        ch.ack(msg);
        console.log(`✅ Message processed successfully from ${queue}`);
      } catch (error) {
        console.error(`❌ Error processing message from ${queue}:`, error);

        // Reject and requeue (will go to dead letter queue after max retries)
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          // Republish with retry count
          ch.nack(msg, false, false); // Don't requeue, let dead letter handle it
        } else {
          // Max retries reached, send to dead letter queue
          ch.nack(msg, false, false);
          console.error(`Max retries (${maxRetries}) reached for message`);
        }
      }
    },
    { noAck: false }
  );
}
