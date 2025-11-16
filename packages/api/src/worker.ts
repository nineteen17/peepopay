import dotenv from 'dotenv';
import { initRedis, closeRedis } from './lib/redis.js';
import { initRabbitMQ, closeRabbitMQ, consumeQueue, QUEUES } from './lib/queue.js';
import {
  initBull,
  closeBull,
  processBookingReminders,
  processOnboardingReminders,
  processNoShowDetection,
  scheduleNoShowDetection,
} from './lib/bull.js';
import { processNoShows } from './lib/noShowDetection.js';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { config } from './config/index.js';
import {
  BookingConfirmationEmail,
  BookingCancellationEmail,
  BookingCompletedEmail,
  BookingReminderEmail,
  OnboardingReminderEmail,
  PaymentFailedEmail,
  GenericNotificationEmail,
  WelcomeEmail,
  VerifyEmail,
  PasswordResetEmail,
  PasswordChangedEmail,
  NoShowNotificationEmail,
  RefundNotificationEmail,
  DisputeCreatedEmail,
  DisputeResolvedEmail,
} from './emails/index.js';
import type { Job } from 'bull';

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

// Booking cancellation handler
async function handleBookingCancellation(message: any) {
  const { bookingId, customerEmail, providerEmail, details } = message;

  console.log(`❌ Processing booking cancellation for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Send cancellation email to customer
    const customerHtml = render(
      BookingCancellationEmail({
        bookingId,
        serviceName: details.serviceName,
        duration: details.duration,
        price: details.price,
        recipientEmail: customerEmail,
        recipientName: details.customerName,
        bookingDate,
        recipientType: 'customer',
        refundAmount: details.refundAmount,
        refundTimeframe: '5-10 business days',
        feeCharged: details.feeCharged,
        policyExplanation: details.policyExplanation,
        hoursUntilBooking: details.hoursUntilBooking,
        cancellationReason: details.cancellationReason,
      })
    );

    const customerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Booking Cancelled - ${details.serviceName}`,
      html: customerHtml,
    });

    if (customerResult.error) {
      throw new Error(`Customer email: ${customerResult.error.message}`);
    }

    console.log(`✅ Customer cancellation email sent (ID: ${customerResult.data?.id})`);

    // Send cancellation email to provider
    const providerHtml = render(
      BookingCancellationEmail({
        bookingId,
        serviceName: details.serviceName,
        duration: details.duration,
        price: details.price,
        recipientEmail: providerEmail,
        recipientName: details.providerName,
        bookingDate,
        recipientType: 'provider',
      })
    );

    const providerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: providerEmail,
      subject: `Booking Cancelled - ${details.serviceName}`,
      html: providerHtml,
    });

    if (providerResult.error) {
      throw new Error(`Provider email: ${providerResult.error.message}`);
    }

    console.log(`✅ Provider cancellation email sent (ID: ${providerResult.data?.id})`);
    console.log(`✅ All cancellation emails sent for ${bookingId}`);
  } catch (error) {
    console.error(`❌ Failed to send booking cancellation for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Payment failure handler
async function handlePaymentFailure(message: any) {
  const { bookingId, customerEmail, details } = message;

  console.log(`💳 Processing payment failure for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Render the payment failed email template
    const html = render(
      PaymentFailedEmail({
        bookingId,
        serviceName: details.serviceName,
        customerName: details.customerName,
        customerEmail,
        bookingDate: bookingDate || 'N/A',
        amount: details.amount,
        failureReason: details.failureReason,
      })
    );

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Payment Failed - ${details.serviceName}`,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Payment failure email sent for ${bookingId} (ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send payment failure email for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Booking completion handler
async function handleBookingCompletion(message: any) {
  const { bookingId, customerEmail, providerEmail, details } = message;

  console.log(`✅ Processing booking completion for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Send completion email to customer
    const customerHtml = render(
      BookingCompletedEmail({
        bookingId,
        serviceName: details.serviceName,
        duration: details.duration,
        price: details.price,
        recipientEmail: customerEmail,
        recipientName: details.customerName,
        bookingDate,
        recipientType: 'customer',
      })
    );

    const customerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Service Completed - ${details.serviceName}`,
      html: customerHtml,
    });

    if (customerResult.error) {
      throw new Error(`Customer email: ${customerResult.error.message}`);
    }

    console.log(`✅ Customer completion email sent (ID: ${customerResult.data?.id})`);

    // Send completion email to provider
    const providerHtml = render(
      BookingCompletedEmail({
        bookingId,
        serviceName: details.serviceName,
        duration: details.duration,
        price: details.price,
        recipientEmail: providerEmail,
        recipientName: details.providerName,
        bookingDate,
        recipientType: 'provider',
      })
    );

    const providerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: providerEmail,
      subject: `Booking Completed - ${details.serviceName}`,
      html: providerHtml,
    });

    if (providerResult.error) {
      throw new Error(`Provider email: ${providerResult.error.message}`);
    }

    console.log(`✅ Provider completion email sent (ID: ${providerResult.data?.id})`);
    console.log(`✅ All completion emails sent for ${bookingId}`);
  } catch (error) {
    console.error(`❌ Failed to send booking completion emails for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// No-show notification handler
async function handleNoShowNotification(message: any) {
  const { bookingId, customerEmail, providerEmail, details } = message;

  console.log(`🚫 Processing no-show notification for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Send no-show email to customer
    const customerHtml = render(
      NoShowNotificationEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        feeCharged: details.feeCharged,
        recipientName: details.customerName,
        recipientEmail: customerEmail,
        recipientType: 'customer',
      })
    );

    const customerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `No-Show Fee Notice - ${details.serviceName}`,
      html: customerHtml,
    });

    if (customerResult.error) {
      throw new Error(`Customer email: ${customerResult.error.message}`);
    }

    console.log(`✅ Customer no-show email sent (ID: ${customerResult.data?.id})`);

    // Send no-show email to provider
    const providerHtml = render(
      NoShowNotificationEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        feeCharged: details.feeCharged,
        recipientName: details.providerName,
        recipientEmail: providerEmail,
        recipientType: 'provider',
      })
    );

    const providerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: providerEmail,
      subject: `Customer No-Show - ${details.serviceName}`,
      html: providerHtml,
    });

    if (providerResult.error) {
      throw new Error(`Provider email: ${providerResult.error.message}`);
    }

    console.log(`✅ Provider no-show email sent (ID: ${providerResult.data?.id})`);
    console.log(`✅ All no-show emails sent for ${bookingId}`);
  } catch (error) {
    console.error(`❌ Failed to send no-show notification for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Refund notification handler
async function handleRefundNotification(message: any) {
  const { bookingId, customerEmail, details } = message;

  console.log(`💰 Processing refund notification for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Render the refund notification email template
    const html = render(
      RefundNotificationEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        refundAmount: details.refundAmount,
        cancellationReason: details.cancellationReason,
        customerName: details.customerName,
        customerEmail,
      })
    );

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Refund Processed - ${details.serviceName}`,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Refund notification sent for ${bookingId} (ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send refund notification for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Dispute created handler
async function handleDisputeCreated(message: any) {
  const { bookingId, customerEmail, providerEmail, details } = message;

  console.log(`⚖️  Processing dispute created notification for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Send dispute created email to customer
    const customerHtml = render(
      DisputeCreatedEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        disputeReason: details.disputeReason,
        recipientName: details.customerName,
        recipientEmail: customerEmail,
        recipientType: 'customer',
        customerName: details.customerName,
        providerName: details.providerName,
      })
    );

    const customerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Dispute Received - ${details.serviceName}`,
      html: customerHtml,
    });

    if (customerResult.error) {
      throw new Error(`Customer email: ${customerResult.error.message}`);
    }

    console.log(`✅ Customer dispute created email sent (ID: ${customerResult.data?.id})`);

    // Send dispute created email to provider
    const providerHtml = render(
      DisputeCreatedEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        disputeReason: details.disputeReason,
        recipientName: details.providerName,
        recipientEmail: providerEmail,
        recipientType: 'provider',
        customerName: details.customerName,
        providerName: details.providerName,
      })
    );

    const providerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: providerEmail,
      subject: `Customer Dispute Filed - ${details.serviceName}`,
      html: providerHtml,
    });

    if (providerResult.error) {
      throw new Error(`Provider email: ${providerResult.error.message}`);
    }

    console.log(`✅ Provider dispute created email sent (ID: ${providerResult.data?.id})`);
    console.log(`✅ All dispute created emails sent for ${bookingId}`);
  } catch (error) {
    console.error(`❌ Failed to send dispute created notification for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Dispute resolved handler
async function handleDisputeResolved(message: any) {
  const { bookingId, customerEmail, providerEmail, details } = message;

  console.log(`⚖️  Processing dispute resolved notification for ${bookingId}`);

  try {
    const bookingDate = details.bookingDate
      ? new Date(details.bookingDate).toLocaleString()
      : undefined;

    // Send dispute resolved email to customer
    const customerHtml = render(
      DisputeResolvedEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        resolution: details.resolution,
        resolutionNotes: details.resolutionNotes,
        refundAmount: details.refundAmount,
        recipientName: details.customerName,
        recipientEmail: customerEmail,
        recipientType: 'customer',
        customerName: details.customerName,
        providerName: details.providerName,
      })
    );

    const customerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Dispute Resolved - ${details.serviceName}`,
      html: customerHtml,
    });

    if (customerResult.error) {
      throw new Error(`Customer email: ${customerResult.error.message}`);
    }

    console.log(`✅ Customer dispute resolved email sent (ID: ${customerResult.data?.id})`);

    // Send dispute resolved email to provider
    const providerHtml = render(
      DisputeResolvedEmail({
        bookingId,
        serviceName: details.serviceName,
        bookingDate: bookingDate || 'N/A',
        resolution: details.resolution,
        resolutionNotes: details.resolutionNotes,
        refundAmount: details.refundAmount,
        recipientName: details.providerName,
        recipientEmail: providerEmail,
        recipientType: 'provider',
        customerName: details.customerName,
        providerName: details.providerName,
      })
    );

    const providerResult = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: providerEmail,
      subject: `Dispute Resolved - ${details.serviceName}`,
      html: providerHtml,
    });

    if (providerResult.error) {
      throw new Error(`Provider email: ${providerResult.error.message}`);
    }

    console.log(`✅ Provider dispute resolved email sent (ID: ${providerResult.data?.id})`);
    console.log(`✅ All dispute resolved emails sent for ${bookingId}`);
  } catch (error) {
    console.error(`❌ Failed to send dispute resolved notification for ${bookingId}:`, error);
    throw error; // Will be retried or sent to dead letter queue
  }
}

// Booking reminder handler (Bull queue processor)
async function handleBookingReminder(job: Job) {
  const { bookingId, customerEmail, customerName, serviceName, bookingDate, duration, price } = job.data;

  console.log(`⏰ Processing booking reminder for ${bookingId}`);

  try {
    let cancellationDeadline: string | undefined;
    let lateCancellationFee: number | undefined;
    let noShowFee: number | undefined;
    let hasFlexPass = false;
    let freeCancellationHours: number | undefined;

    try {
      // Fetch booking directly from database to get policy snapshot
      const { db } = await import('./db/index.js');
      const { bookings } = await import('./db/schema/index.js');
      const { eq } = await import('drizzle-orm');

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (booking && booking.policySnapshotJson) {
        const policy = typeof booking.policySnapshotJson === 'string'
          ? JSON.parse(booking.policySnapshotJson)
          : booking.policySnapshotJson;

        // Calculate cancellation deadline
        if (policy.cancellationWindowHours) {
          const bookingTime = new Date(bookingDate);
          const deadline = new Date(bookingTime.getTime() - (policy.cancellationWindowHours * 60 * 60 * 1000));
          cancellationDeadline = deadline.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          freeCancellationHours = policy.cancellationWindowHours;
        }

        lateCancellationFee = policy.lateCancellationFee || undefined;
        noShowFee = policy.noShowFee || undefined;
        hasFlexPass = booking.flexPassPurchased || false;
      }
    } catch (err) {
      console.warn(`⚠️  Could not fetch policy info for booking ${bookingId}, sending basic reminder`);
    }

    // Render the booking reminder email template with policy info
    const html = render(
      BookingReminderEmail({
        bookingId,
        customerName,
        serviceName,
        bookingDate,
        duration,
        price,
        cancellationDeadline,
        lateCancellationFee,
        noShowFee,
        hasFlexPass,
        freeCancellationHours,
      })
    );

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: customerEmail,
      subject: `Reminder: Your booking for ${serviceName} is coming up soon`,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Reminder email sent for booking ${bookingId} (ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send reminder email for booking ${bookingId}:`, error);
    throw error; // Will be retried by Bull
  }
}

// Onboarding reminder handler (Bull queue processor)
async function handleOnboardingReminder(job: Job) {
  const { userId, userName, userEmail, onboardingUrl, daysWaiting } = job.data;

  console.log(`🔔 Processing onboarding reminder for user ${userId} (${daysWaiting} days)`);

  try {
    // Import UsersService to check onboarding status
    const { UsersService } = await import('./modules/users/users.service.js');
    const usersService = new UsersService();

    // Check if user has already completed onboarding
    const user = await usersService.getUserById(userId);

    if (user.stripeOnboarded) {
      console.log(`⏭️  Skipping onboarding reminder for user ${userId} - already onboarded`);
      return; // User has already completed onboarding, no need to send reminder
    }

    // Render the onboarding reminder email template
    const html = render(
      OnboardingReminderEmail({
        userName,
        userEmail,
        onboardingUrl,
        daysWaiting,
      })
    );

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: userEmail,
      subject: `Complete Your PeepoPay Setup - Start Accepting Bookings Today`,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log(`✅ Onboarding reminder sent to ${userEmail} (${daysWaiting} days, ID: ${result.data?.id})`);
  } catch (error) {
    console.error(`❌ Failed to send onboarding reminder to ${userEmail}:`, error);
    throw error; // Will be retried by Bull
  }
}

// No-show detection handler (Bull queue processor)
async function handleNoShowDetection(job: Job) {
  console.log(`🔍 Processing no-show detection job ${job.id}`);

  try {
    const summary = await processNoShows();

    console.log(`📊 No-show detection summary:`, {
      totalFound: summary.totalFound,
      totalProcessed: summary.totalProcessed,
      totalFailed: summary.totalFailed,
    });

    if (summary.errors.length > 0) {
      console.error(`⚠️  Errors occurred during no-show detection:`, summary.errors);
    }

    // Job succeeds even if some bookings failed - we don't want to retry the entire batch
    // Individual booking errors are logged above
  } catch (error) {
    console.error(`❌ Failed to process no-show detection:`, error);
    throw error; // Will be retried by Bull
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

  console.log(`💳 Processing Stripe webhook: ${eventType} (ID: ${eventId})`);

  try {
    // Import and instantiate WebhooksService
    const { WebhooksService } = await import('./modules/webhooks/webhooks.service.js');
    const webhooksService = new WebhooksService();

    // Process the webhook event
    await webhooksService.processStripeEvent({
      id: eventId,
      type: eventType,
      data: { object: data },
    });

    console.log(`✅ Webhook processed successfully: ${eventType}`);
  } catch (error) {
    console.error(`❌ Failed to process webhook ${eventType}:`, error);
    throw error; // Will be retried or sent to dead letter queue
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
    await initBull();

    console.log('✅ Worker services initialized');

    // Start consuming RabbitMQ queues
    await consumeQueue(QUEUES.EMAIL_NOTIFICATIONS, handleEmailNotification, { prefetch: 5 });
    await consumeQueue(QUEUES.BOOKING_CONFIRMATIONS, handleBookingConfirmation, { prefetch: 3 });
    await consumeQueue(QUEUES.BOOKING_CANCELLATIONS, handleBookingCancellation, { prefetch: 3 });
    await consumeQueue(QUEUES.BOOKING_COMPLETIONS, handleBookingCompletion, { prefetch: 3 });
    await consumeQueue(QUEUES.NO_SHOW_NOTIFICATIONS, handleNoShowNotification, { prefetch: 3 });
    await consumeQueue(QUEUES.REFUND_NOTIFICATIONS, handleRefundNotification, { prefetch: 5 });
    await consumeQueue(QUEUES.DISPUTE_CREATED, handleDisputeCreated, { prefetch: 3 });
    await consumeQueue(QUEUES.DISPUTE_RESOLVED, handleDisputeResolved, { prefetch: 3 });
    await consumeQueue(QUEUES.PAYMENT_FAILURES, handlePaymentFailure, { prefetch: 5 });
    await consumeQueue(QUEUES.AUTH_EMAILS, handleAuthEmail, { prefetch: 5 });
    await consumeQueue(QUEUES.STRIPE_WEBHOOKS, handleStripeWebhook, { prefetch: 10 });
    await consumeQueue(QUEUES.FAILED_JOBS, handleFailedJob, { prefetch: 1 });

    // Start processing Bull queues
    await processBookingReminders(handleBookingReminder);
    await processOnboardingReminders(handleOnboardingReminder);
    await processNoShowDetection(handleNoShowDetection);

    // Schedule recurring no-show detection (runs every hour)
    await scheduleNoShowDetection();

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
    await closeBull();
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
