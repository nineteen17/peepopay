import { Resend } from 'resend';
import { render } from '@react-email/render';
import { config } from '../config/index.js';
import {
  WelcomeEmail,
  VerifyEmail,
  PasswordResetEmail,
  PasswordChangedEmail,
  GenericNotificationEmail,
} from '../emails/index.js';

// Initialize Resend client
const resend = new Resend(config.email.apiKey);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email via Resend
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      throw new Error(result.error.message);
    }

    console.log(`✅ Email sent successfully to ${to} (ID: ${result.data?.id})`);
    return result.data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string,
  dashboardUrl?: string
) {
  const html = render(
    WelcomeEmail({
      userName,
      userEmail: to,
      dashboardUrl: dashboardUrl || config.betterAuth.url,
    })
  );

  return sendEmail({
    to,
    subject: 'Welcome to PeepoPay! 🎉',
    html,
  });
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  to: string,
  userName: string,
  verificationUrl: string,
  verificationCode?: string,
  expiresIn?: string
) {
  const html = render(
    VerifyEmail({
      userName,
      verificationUrl,
      verificationCode,
      expiresIn,
    })
  );

  return sendEmail({
    to,
    subject: 'Verify Your Email - PeepoPay',
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetUrl: string,
  resetCode?: string,
  expiresIn?: string
) {
  const html = render(
    PasswordResetEmail({
      userName,
      resetUrl,
      resetCode,
      expiresIn,
    })
  );

  return sendEmail({
    to,
    subject: 'Reset Your Password - PeepoPay',
    html,
  });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(
  to: string,
  userName: string,
  changedAt: string,
  ipAddress?: string,
  userAgent?: string
) {
  const html = render(
    PasswordChangedEmail({
      userName,
      changedAt,
      ipAddress,
      userAgent,
    })
  );

  return sendEmail({
    to,
    subject: 'Your Password Has Been Changed - PeepoPay',
    html,
  });
}

/**
 * Send generic notification email
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  body: string
) {
  const html = render(
    GenericNotificationEmail({
      subject,
      body,
      previewText: subject,
    })
  );

  return sendEmail({
    to,
    subject,
    html,
  });
}
