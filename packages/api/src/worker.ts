import dotenv from 'dotenv';
import { initRedis, closeRedis } from './lib/redis.js';
import { initRabbitMQ, closeRabbitMQ, consumeQueue, QUEUES } from './lib/queue.js';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { config } from './config/index.js';
import {
  BookingConfirmationEmail,
  GenericNotificationEmail,
  WelcomeEmail,
  VerifyEmail,
  PasswordResetEmail,
  PasswordChangedEmail,
} from './emails/index.js';

dotenv.config();

// Initialize Resend client
const resend = new Resend(config.email.apiKey);

// Email notification handler
async function handleEmailNotification(message: any) {
  const { to, subject, body } = message;

  console.log(`📧 Sending email to ${to}`);

  try {
    // Render the generic notification email template
    const html = render(
      GenericNotificationEmail({
        subject,
        body,
        previewText: subject,
      })
    );

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to,
      subject,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Email sent successfully to ${to} (ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Booking confirmation handler
async function handleBookingConfirmation(message: any) {
  const { bookingId, customerEmail, details } = message;

  console.log(`📝 Processing booking confirmation for ${bookingId}`);

  try {
    // Render the booking confirmation email template
    const html = render(
      BookingConfirmationEmail({
        bookingId,
        serviceName: details.serviceName,
        duration: details.duration,
        price: details.price,
        customerEmail,
        bookingDate: details.scheduledFor
          ? new Date(details.scheduledFor).toLocaleString()
          : undefined,
      })
    );

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Booking Confirmed - ${details.serviceName}`,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Booking confirmation sent for ${bookingId} (ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send booking confirmation for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Auth email handler
async function handleAuthEmail(message: any) {
  const { type, to, data } = message;

  console.log(`🔐 Processing auth email: ${type} to ${to}`);

  try {
    let html: string;
    let subject: string;

    switch (type) {
      case 'welcome':
        html = render(
          WelcomeEmail({
            userName: data.userName,
            userEmail: to,
            dashboardUrl: data.dashboardUrl || config.betterAuth.url,
          })
        );
        subject = 'Welcome to PeepoPay! 🎉';
        break;

      case 'verification':
        html = render(
          VerifyEmail({
            userName: data.userName,
            verificationUrl: data.verificationUrl,
            verificationCode: data.verificationCode,
            expiresIn: data.expiresIn || '24 hours',
          })
        );
        subject = 'Verify Your Email - PeepoPay';
        break;

      case 'password-reset':
        html = render(
          PasswordResetEmail({
            userName: data.userName,
            resetUrl: data.resetUrl,
            resetCode: data.resetCode,
            expiresIn: data.expiresIn || '1 hour',
          })
        );
        subject = 'Reset Your Password - PeepoPay';
        break;

      case 'password-changed':
        html = render(
          PasswordChangedEmail({
            userName: data.userName,
            changedAt: data.changedAt,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          })
        );
        subject = 'Your Password Has Been Changed - PeepoPay';
        break;

      default:
        throw new Error(`Unknown auth email type: ${type}`);
    }

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to,
      subject,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Auth email sent: ${type} to ${to} (ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send auth email (${type}) to ${to}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
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
    await consumeQueue(QUEUES.AUTH_EMAILS, handleAuthEmail, { prefetch: 5 });
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
