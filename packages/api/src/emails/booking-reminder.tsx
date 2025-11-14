import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';
import { format } from 'date-fns';

interface BookingReminderEmailProps {
  bookingId: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  duration?: number;
  price?: number;
}

export const BookingReminderEmail = ({
  bookingId,
  customerName,
  serviceName,
  bookingDate,
  duration,
  price,
}: BookingReminderEmailProps) => {
  const formattedDate = new Date(bookingDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const timeUntil = (() => {
    const now = new Date();
    const booking = new Date(bookingDate);
    const hours = Math.floor((booking.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hours < 24) {
      return `in ${hours} hours`;
    } else {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
  })();

  return (
    <Html>
      <Head />
      <Preview>
        Reminder: Your booking for {serviceName} is coming up {timeUntil}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⏰ Booking Reminder</Heading>

          <Text style={text}>
            Hi {customerName},
          </Text>

          <Text style={text}>
            This is a friendly reminder that your booking is coming up {timeUntil}!
          </Text>

          <Section style={reminderSection}>
            <Text style={reminderText}>
              <strong>🗓️  {formattedDate}</strong>
            </Text>
          </Section>

          <Section style={detailsSection}>
            <Heading as="h2" style={h2}>Booking Details</Heading>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Booking ID:</td>
                  <td style={valueCell}>{bookingId}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Service:</td>
                  <td style={valueCell}>{serviceName}</td>
                </tr>
                {duration && (
                  <tr>
                    <td style={labelCell}>Duration:</td>
                    <td style={valueCell}>{duration} minutes</td>
                  </tr>
                )}
                {price && (
                  <tr>
                    <td style={labelCell}>Price:</td>
                    <td style={valueCell}>${(price / 100).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td style={labelCell}>Date & Time:</td>
                  <td style={valueCell}>{formattedDate}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={ctaSection}>
            <Text style={ctaText}>
              Need to make changes to your booking?
            </Text>
            <Button
              style={button}
              href={`https://peepopay.com/bookings/${bookingId}`}
            >
              View Booking
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>💡 Helpful tips:</strong>
          </Text>
          <ul style={listStyle}>
            <li style={listItem}>Please arrive on time for your appointment</li>
            <li style={listItem}>If you need to cancel, please do so at least 24 hours in advance</li>
            <li style={listItem}>Save this email for your records</li>
          </ul>

          <Text style={footer}>
            We look forward to serving you! If you have any questions, please don't hesitate to reach out.
          </Text>

          <Text style={footer}>
            This is an automated reminder email from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
};

const reminderSection = {
  margin: '24px 40px',
  backgroundColor: '#fff7ed',
  border: '2px solid #fb923c',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
};

const reminderText = {
  color: '#c2410c',
  fontSize: '18px',
  lineHeight: '24px',
  margin: '0',
};

const detailsSection = {
  margin: '32px 40px',
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const detailsTable = {
  width: '100%',
  fontSize: '14px',
  lineHeight: '20px',
};

const labelCell = {
  color: '#6b7280',
  paddingRight: '12px',
  paddingBottom: '8px',
  verticalAlign: 'top' as const,
  fontWeight: '500',
  width: '40%',
};

const valueCell = {
  color: '#111827',
  paddingBottom: '8px',
  verticalAlign: 'top' as const,
};

const ctaSection = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  fontWeight: '500',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: '0 auto',
};

const listStyle = {
  margin: '8px 40px',
  padding: '0 0 0 20px',
};

const listItem = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '12px 40px',
};
