import dotenv from 'dotenv';
import { initRedis, closeRedis } from './lib/redis.js';
import { initRabbitMQ, closeRabbitMQ, consumeQueue, QUEUES } from './lib/queue.js';
import nodemailer from 'nodemailer';
import { config } from './config/index.js';

dotenv.config();

// Email transporter
const transporter = nodemailer.createTransporter({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: config.email.user && config.email.password ? {
    user: config.email.user,
    pass: config.email.password,
  } : undefined,
});

// Email notification handler
async function handleEmailNotification(message: any) {
  const { to, subject, body } = message;

  console.log(`📧 Sending email to ${to}`);

  try {
    await transporter.sendMail({
      from: config.email.user || 'noreply@peepopay.com',
      to,
      subject,
      html: body,
    });

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Booking confirmation handler
async function handleBookingConfirmation(message: any) {
  const { bookingId, customerEmail, details } = message;

  console.log(`📝 Processing booking confirmation for ${bookingId}`);

  const emailBody = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Booking Confirmed! 🎉</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hi there,</p>
          <p style="font-size: 16px;">Your booking has been confirmed! Here are the details:</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Service:</strong> ${details.serviceName}</p>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${new Date(details.scheduledFor).toLocaleString()}</p>
            <p style="margin: 10px 0;"><strong>Duration:</strong> ${details.duration} minutes</p>
            <p style="margin: 10px 0;"><strong>Price:</strong> $${(details.price / 100).toFixed(2)}</p>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            If you need to make any changes or have questions, please contact the service provider directly.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            PeepoPay - Simplifying bookings for tradies and customers
          </p>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: config.email.user || 'noreply@peepopay.com',
    to: customerEmail,
    subject: `Booking Confirmed - ${details.serviceName}`,
    html: emailBody,
  });

  console.log(`✅ Booking confirmation sent for ${bookingId}`);
}

// Stripe webhook handler
async function handleStripeWebhook(message: any) {
  const { eventId, eventType, data } = message;

  console.log(`💳 Processing Stripe webhook: ${eventType}`);

  // Process different webhook events
  switch (eventType) {
    case 'payment_intent.succeeded':
      console.log(`✅ Payment succeeded for ${data.object.id}`);
      // Additional processing...
      break;

    case 'payment_intent.payment_failed':
      console.log(`❌ Payment failed for ${data.object.id}`);
      // Send failure notification...
      break;

    case 'account.updated':
      console.log(`📊 Stripe account updated: ${data.object.id}`);
      // Update user's Stripe account status...
      break;

    default:
      console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
  }
}

// Failed jobs handler (dead letter queue)
async function handleFailedJob(message: any) {
  console.error(`☠️ Processing failed job:`, message);

  // Log to monitoring service, send alert, etc.
  // In production, you might want to store these in a database for manual review
}

// Start worker
async function startWorker() {
  try {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║   🛠️  PeepoPay Worker Service         ║
    ║                                       ║
    ║   Environment: ${config.nodeEnv.padEnd(23)} ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    `);

    // Initialize services
    await initRedis();
    await initRabbitMQ();

    console.log('✅ Worker services initialized');

    // Start consuming queues
    await consumeQueue(QUEUES.EMAIL_NOTIFICATIONS, handleEmailNotification, { prefetch: 5 });
    await consumeQueue(QUEUES.BOOKING_CONFIRMATIONS, handleBookingConfirmation, { prefetch: 3 });
    await consumeQueue(QUEUES.STRIPE_WEBHOOKS, handleStripeWebhook, { prefetch: 10 });
    await consumeQueue(QUEUES.FAILED_JOBS, handleFailedJob, { prefetch: 1 });

    console.log('✅ Worker is ready and listening for jobs...');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} signal received: shutting down worker gracefully`);

  try {
    await closeRedis();
    await closeRabbitMQ();
    console.log('✅ Worker shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the worker
startWorker();
