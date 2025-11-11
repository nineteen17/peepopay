# Email Service Guide

## Overview

PeepoPay uses [Resend](https://resend.com) with [React Email](https://react.email) for sending transactional emails. This guide covers setup, configuration, and usage of the email service.

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Setup Instructions](#setup-instructions)
3. [Configuration](#configuration)
4. [Email Templates](#email-templates)
5. [Sending Emails](#sending-emails)
6. [Queue System](#queue-system)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Technology Stack

### Resend

Resend is a modern email API built for developers. We chose Resend because:

- **Simple API**: Easy-to-use REST API with TypeScript support
- **Reliable**: Built on AWS SES with high deliverability
- **Developer-friendly**: Great documentation and debugging tools
- **React Email integration**: First-class support for React Email templates
- **Free tier**: 100 emails/day free, perfect for development
- **No SMTP complexity**: No need to manage SMTP servers

### React Email

React Email allows us to build email templates using React components:

- **Component-based**: Build emails with familiar React patterns
- **Type-safe**: Full TypeScript support
- **Preview**: Built-in preview tool for development
- **Reusable**: Share components across templates
- **Responsive**: Easy to build mobile-friendly emails

## Setup Instructions

### 1. Sign Up for Resend

1. Go to [resend.com](https://resend.com) and create an account
2. Navigate to the API Keys section
3. Create a new API key
4. Copy the API key (it starts with `re_`)

### 2. Configure Domain (Production)

For production, you'll need to verify your domain:

1. Go to the Domains section in Resend dashboard
2. Add your domain (e.g., `peepopay.com`)
3. Add the DNS records provided by Resend
4. Wait for verification (usually a few minutes)
5. Set your `FROM_EMAIL` to use your verified domain

For development, you can use the default `onboarding@resend.dev` domain.

### 3. Install Dependencies

The required packages are already in `package.json`:

```bash
cd packages/api
npm install
```

Dependencies installed:
- `resend` - Resend SDK
- `react` - Required for React Email
- `@react-email/components` - Pre-built email components
- `@react-email/render` - Render React components to HTML

### 4. Environment Variables

Add the following to your `.env` file:

```bash
# Email (Resend)
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@peepopay.com
FROM_NAME=PeepoPay
```

**Important Notes:**
- `RESEND_API_KEY` is required - the app will not start without it
- `FROM_EMAIL` must be from a verified domain in production
- In development, you can use `onboarding@resend.dev` for testing
- `FROM_NAME` is the friendly name shown to recipients

## Configuration

Email configuration is managed in `/packages/api/src/config/index.ts`:

```typescript
email: {
  apiKey: process.env.RESEND_API_KEY!,
  fromEmail: process.env.FROM_EMAIL || 'noreply@peepopay.com',
  fromName: process.env.FROM_NAME || 'PeepoPay',
},
```

The API key is validated on startup - the application will fail to start if `RESEND_API_KEY` is missing.

## Email Templates

Email templates are React components located in `/packages/api/src/emails/`.

### Available Templates

#### 1. Booking Confirmation Email

**File**: `src/emails/booking-confirmation.tsx`

Used when a customer completes a booking payment.

**Props**:
```typescript
interface BookingConfirmationEmailProps {
  bookingId: string;
  serviceName: string;
  duration: number;
  price: number;
  customerEmail: string;
  bookingDate?: string;
}
```

**Preview**:
```tsx
import { BookingConfirmationEmail } from './emails';

<BookingConfirmationEmail
  bookingId="BK123456789"
  serviceName="Premium Consultation"
  duration={60}
  price={5000} // in cents
  customerEmail="customer@example.com"
  bookingDate="November 15, 2025 at 2:00 PM"
/>
```

#### 2. Generic Notification Email

**File**: `src/emails/generic-notification.tsx`

Used for general notifications and alerts.

**Props**:
```typescript
interface GenericNotificationEmailProps {
  subject: string;
  body: string;
  previewText?: string;
}
```

### Creating New Templates

1. Create a new file in `src/emails/` (e.g., `password-reset.tsx`)
2. Import React Email components:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Button,
  Link,
} from '@react-email/components';
import * as React from 'react';
```

3. Define your props interface:

```tsx
interface PasswordResetEmailProps {
  resetUrl: string;
  userName: string;
}
```

4. Create your component:

```tsx
export const PasswordResetEmail = ({
  resetUrl,
  userName,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Reset</Heading>
          <Text>Hi {userName},</Text>
          <Text>Click the button below to reset your password:</Text>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Container>
      </Body>
    </Html>
  );
};
```

5. Add preview props for development:

```tsx
PasswordResetEmail.PreviewProps = {
  resetUrl: 'https://peepopay.com/reset?token=abc123',
  userName: 'John Doe',
} as PasswordResetEmailProps;

export default PasswordResetEmail;
```

6. Export from `src/emails/index.ts`:

```tsx
export { PasswordResetEmail } from './password-reset';
```

### Template Development

Use React Email's preview tool for development:

```bash
cd packages/api
npx react-email dev
```

This opens a browser preview at `http://localhost:3000` where you can:
- Preview all templates
- Test with different props
- See responsive views
- Export HTML

## Sending Emails

### Using the Queue System (Recommended)

The worker service processes emails asynchronously using RabbitMQ:

```typescript
import { QueueService } from './lib/queue';

// Generic notification
await queueService.publishEmailNotification(
  'user@example.com',
  'Welcome to PeepoPay',
  'Thanks for signing up!'
);

// Booking confirmation
await queueService.publishBookingConfirmation(
  'booking-123',
  'customer@example.com',
  {
    serviceName: 'House Cleaning',
    duration: 120,
    price: 15000, // in cents
    scheduledFor: new Date().toISOString(),
  }
);
```

### Direct Sending (Advanced)

For immediate sending without queuing:

```typescript
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { BookingConfirmationEmail } from './emails';
import { config } from './config';

const resend = new Resend(config.email.apiKey);

const html = render(
  BookingConfirmationEmail({
    bookingId: 'BK123',
    serviceName: 'Consultation',
    duration: 60,
    price: 5000,
    customerEmail: 'customer@example.com',
  })
);

const result = await resend.emails.send({
  from: `${config.email.fromName} <${config.email.fromEmail}>`,
  to: 'customer@example.com',
  subject: 'Booking Confirmed',
  html,
});

if (result.error) {
  console.error('Failed to send email:', result.error);
} else {
  console.log('Email sent:', result.data.id);
}
```

## Queue System

The email system uses RabbitMQ for reliable, asynchronous processing.

### Queue Names

- `EMAIL_NOTIFICATIONS` - Generic email notifications
- `BOOKING_CONFIRMATIONS` - Booking confirmation emails
- `FAILED_JOBS` - Dead letter queue for failed emails

### Worker Service

The worker service (`src/worker.ts`) handles email processing:

**Starting the worker:**
```bash
npm run dev:worker
```

**Production:**
```bash
npm run build
npm run start:worker
```

### Retry Logic

- Failed emails are automatically retried 3 times
- Exponential backoff between retries
- After 3 failures, messages move to `FAILED_JOBS` queue
- Failed jobs are logged for manual review

### Message Flow

```
1. API publishes message to queue
   ↓
2. Worker consumes message
   ↓
3. Worker renders React Email template
   ↓
4. Worker sends via Resend API
   ↓
5. On failure: Retry or move to dead letter queue
```

## Testing

### Development Testing

1. **Use Resend Test Mode**: In development, Resend provides a test domain

```bash
FROM_EMAIL=onboarding@resend.dev
```

2. **Check Resend Dashboard**: View sent emails in the Resend dashboard
3. **Use Preview Tool**: Test templates without sending:

```bash
npx react-email dev
```

### Testing Email Sending

Create a test script (`scripts/test-email.ts`):

```typescript
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { BookingConfirmationEmail } from '../src/emails';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  const html = render(
    BookingConfirmationEmail({
      bookingId: 'TEST123',
      serviceName: 'Test Service',
      duration: 60,
      price: 5000,
      customerEmail: 'your-test-email@example.com',
    })
  );

  const result = await resend.emails.send({
    from: 'PeepoPay <onboarding@resend.dev>',
    to: 'your-test-email@example.com',
    subject: 'Test Email',
    html,
  });

  console.log('Result:', result);
}

testEmail();
```

Run the test:
```bash
tsx scripts/test-email.ts
```

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable: RESEND_API_KEY"

**Solution**: Add your Resend API key to `.env`:
```bash
RESEND_API_KEY=re_your_api_key
```

#### 2. "Email sending failed: Invalid domain"

**Solution**:
- In development, use `onboarding@resend.dev`
- In production, verify your domain in Resend dashboard

#### 3. "Failed to send email: 403 Forbidden"

**Solution**: Check that your API key is valid and has send permissions

#### 4. Emails not arriving

**Checklist**:
- Check spam folder
- Verify recipient email address
- Check Resend dashboard for delivery status
- Ensure worker service is running
- Check RabbitMQ queue status

#### 5. Template rendering errors

**Solution**:
- Use `npx react-email dev` to preview templates
- Check for TypeScript errors in template files
- Ensure all required props are provided

### Debugging

Enable detailed logging:

```typescript
// In worker.ts
console.log('Sending email:', {
  to,
  subject,
  from: `${config.email.fromName} <${config.email.fromEmail}>`,
});
```

Check Resend logs:
- Go to [resend.com/logs](https://resend.com/logs)
- Filter by email address or date
- View delivery status and errors

### Support

- **Resend Documentation**: https://resend.com/docs
- **React Email Documentation**: https://react.email/docs
- **Resend Support**: support@resend.com

## Best Practices

1. **Always use templates**: Don't send raw HTML strings
2. **Queue emails**: Use the queue system for reliability
3. **Test before production**: Preview templates and test deliverability
4. **Monitor failed jobs**: Regularly check `FAILED_JOBS` queue
5. **Use descriptive subjects**: Help recipients identify emails
6. **Include unsubscribe**: Add unsubscribe links for marketing emails
7. **Verify domains**: Use verified domains in production
8. **Handle errors**: Always check for errors when sending

## Next Steps

- [System Design](../architecture/02-system-design.md) - Understanding the email flow
- [API Routes](../api/routes.md) - How emails are triggered
- [Worker Service](../api/README.md#worker-service) - Queue processing details

---

**Last Updated**: November 11, 2025
**Maintainer**: PeepoPay Team
