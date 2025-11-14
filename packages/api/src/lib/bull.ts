import Bull, { Queue, Job } from 'bull';
import { config } from '../config/index.js';

// Queue instances
let bookingRemindersQueue: Queue | null = null;
let onboardingRemindersQueue: Queue | null = null;

/**
 * Initialize Bull queues with Redis connection
 */
export async function initBull(): Promise<void> {
  try {
    const redisUrl = new URL(config.redisUrl);

    const redisConfig = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379'),
      password: redisUrl.password || undefined,
      db: 0,
    };

    // Initialize booking reminders queue
    bookingRemindersQueue = new Bull('booking-reminders', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Event listeners for monitoring
    bookingRemindersQueue.on('error', (error: Error) => {
      console.error('❌ Bull queue error:', error);
    });

    bookingRemindersQueue.on('waiting', (jobId: string) => {
      console.log(`⏳ Job ${jobId} is waiting`);
    });

    bookingRemindersQueue.on('active', (job: Job) => {
      console.log(`🔄 Processing job ${job.id}`);
    });

    bookingRemindersQueue.on('completed', (job: Job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    bookingRemindersQueue.on('failed', (job: Job, error: Error) => {
      console.error(`❌ Job ${job.id} failed:`, error);
    });

    // Initialize onboarding reminders queue
    onboardingRemindersQueue = new Bull('onboarding-reminders', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Event listeners for onboarding reminders
    onboardingRemindersQueue.on('error', (error: Error) => {
      console.error('❌ Onboarding reminders queue error:', error);
    });

    onboardingRemindersQueue.on('completed', (job: Job) => {
      console.log(`✅ Onboarding reminder job ${job.id} completed`);
    });

    onboardingRemindersQueue.on('failed', (job: Job, error: Error) => {
      console.error(`❌ Onboarding reminder job ${job.id} failed:`, error);
    });

    console.log('✅ Bull queues initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Bull:', error);
    throw error;
  }
}

/**
 * Close Bull queues gracefully
 */
export async function closeBull(): Promise<void> {
  try {
    if (bookingRemindersQueue) {
      await bookingRemindersQueue.close();
      bookingRemindersQueue = null;
    }
    if (onboardingRemindersQueue) {
      await onboardingRemindersQueue.close();
      onboardingRemindersQueue = null;
    }
    console.log('✅ Bull queues closed');
  } catch (error) {
    console.error('❌ Error closing Bull:', error);
  }
}

/**
 * Get the booking reminders queue instance
 */
export function getBookingRemindersQueue(): Queue {
  if (!bookingRemindersQueue) {
    throw new Error('Bull queues not initialized. Call initBull() first.');
  }
  return bookingRemindersQueue;
}

/**
 * Schedule a booking reminder
 *
 * @param bookingId - The booking ID
 * @param customerEmail - Customer's email address
 * @param customerName - Customer's name
 * @param serviceName - Name of the service
 * @param bookingDate - Date of the booking
 * @param reminderDate - Date when the reminder should be sent
 * @returns Job ID
 */
export async function scheduleBookingReminder(
  bookingId: string,
  customerEmail: string,
  customerName: string,
  serviceName: string,
  bookingDate: Date,
  reminderDate: Date
): Promise<string> {
  const queue = getBookingRemindersQueue();

  const delay = reminderDate.getTime() - Date.now();

  if (delay < 0) {
    console.warn(`⚠️ Reminder date is in the past for booking ${bookingId}. Skipping.`);
    return '';
  }

  const job = await queue.add(
    'send-reminder',
    {
      bookingId,
      customerEmail,
      customerName,
      serviceName,
      bookingDate: bookingDate.toISOString(),
      reminderDate: reminderDate.toISOString(),
    },
    {
      delay,
      jobId: `booking-reminder-${bookingId}`, // Unique ID for easy cancellation
    }
  );

  console.log(`📅 Scheduled reminder for booking ${bookingId} (Job ID: ${job.id})`);
  return job.id as string;
}

/**
 * Cancel a booking reminder
 *
 * @param bookingId - The booking ID
 */
export async function cancelBookingReminder(bookingId: string): Promise<void> {
  const queue = getBookingRemindersQueue();
  const jobId = `booking-reminder-${bookingId}`;

  try {
    const job = await queue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`🗑️  Cancelled reminder for booking ${bookingId}`);
    } else {
      console.log(`⚠️  No reminder found for booking ${bookingId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to cancel reminder for booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Process booking reminder jobs
 * This function should be called from the worker
 */
export async function processBookingReminders(
  handler: (job: Job) => Promise<void>
): Promise<void> {
  const queue = getBookingRemindersQueue();

  queue.process('send-reminder', async (job: Job) => {
    console.log(`📧 Processing reminder job ${job.id}`);
    await handler(job);
  });

  console.log('👂 Booking reminders processor registered');
}

/**
 * Get the onboarding reminders queue instance
 */
export function getOnboardingRemindersQueue(): Queue {
  if (!onboardingRemindersQueue) {
    throw new Error('Bull queues not initialized. Call initBull() first.');
  }
  return onboardingRemindersQueue;
}

/**
 * Schedule onboarding reminders at multiple intervals
 * Sends reminders at 24 hours, 3 days, and 7 days if onboarding not completed
 *
 * @param userId - The user's ID
 * @param userName - User's name
 * @param userEmail - User's email address
 * @param onboardingUrl - URL to complete onboarding
 * @returns Array of job IDs
 */
export async function scheduleOnboardingReminders(
  userId: string,
  userName: string,
  userEmail: string,
  onboardingUrl: string
): Promise<string[]> {
  const queue = getOnboardingRemindersQueue();
  const jobIds: string[] = [];

  // Define reminder intervals (in milliseconds)
  const intervals = [
    { delay: 24 * 60 * 60 * 1000, days: 1, label: '24-hour' },      // 24 hours
    { delay: 3 * 24 * 60 * 60 * 1000, days: 3, label: '3-day' },    // 3 days
    { delay: 7 * 24 * 60 * 60 * 1000, days: 7, label: '7-day' },    // 7 days
  ];

  for (const interval of intervals) {
    try {
      const job = await queue.add(
        'send-onboarding-reminder',
        {
          userId,
          userName,
          userEmail,
          onboardingUrl,
          daysWaiting: interval.days,
        },
        {
          delay: interval.delay,
          jobId: `onboarding-reminder-${userId}-${interval.days}d`,
        }
      );

      jobIds.push(job.id as string);
      console.log(`📅 Scheduled ${interval.label} onboarding reminder for user ${userId} (Job ID: ${job.id})`);
    } catch (error) {
      console.error(`❌ Failed to schedule ${interval.label} reminder for user ${userId}:`, error);
    }
  }

  return jobIds;
}

/**
 * Cancel all onboarding reminders for a user
 * Call this when a user completes their Stripe onboarding
 *
 * @param userId - The user's ID
 */
export async function cancelOnboardingReminders(userId: string): Promise<void> {
  const queue = getOnboardingRemindersQueue();

  // All possible reminder job IDs for this user
  const jobIds = [
    `onboarding-reminder-${userId}-1d`,
    `onboarding-reminder-${userId}-3d`,
    `onboarding-reminder-${userId}-7d`,
  ];

  let cancelledCount = 0;

  for (const jobId of jobIds) {
    try {
      const job = await queue.getJob(jobId);

      if (job) {
        await job.remove();
        cancelledCount++;
        console.log(`🗑️  Cancelled onboarding reminder: ${jobId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to cancel reminder ${jobId}:`, error);
    }
  }

  if (cancelledCount > 0) {
    console.log(`✅ Cancelled ${cancelledCount} onboarding reminder(s) for user ${userId}`);
  } else {
    console.log(`⚠️  No pending onboarding reminders found for user ${userId}`);
  }
}

/**
 * Process onboarding reminder jobs
 * This function should be called from the worker
 */
export async function processOnboardingReminders(
  handler: (job: Job) => Promise<void>
): Promise<void> {
  const queue = getOnboardingRemindersQueue();

  queue.process('send-onboarding-reminder', async (job: Job) => {
    console.log(`📧 Processing onboarding reminder job ${job.id}`);
    await handler(job);
  });

  console.log('👂 Onboarding reminders processor registered');
}
