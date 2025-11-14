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

interface BookingCompletedEmailProps {
  bookingId: string;
  serviceName: string;
  duration: number;
  price: number;
  recipientEmail: string;
  recipientName: string;
  bookingDate?: string;
  recipientType: 'customer' | 'provider';
}

export const BookingCompletedEmail = ({
  bookingId,
  serviceName,
  duration,
  price,
  recipientEmail,
  recipientName,
  bookingDate,
  recipientType,
}: BookingCompletedEmailProps) => {
  const isCustomer = recipientType === 'customer';

  return (
    <Html>
      <Head />
      <Preview>
        {isCustomer
          ? `${serviceName} - Booking Completed! Share Your Experience`
          : `Booking Completed - ${serviceName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isCustomer ? '✅ Service Completed!' : '✅ Booking Completed'}
          </Heading>

          <Text style={text}>
            Hi {recipientName},
          </Text>

          {isCustomer ? (
            <>
              <Text style={text}>
                Your service has been marked as completed. We hope you had a great experience!
              </Text>
              <Section style={successSection}>
                <Text style={successText}>
                  <strong>Thank you for using PeepoPay!</strong>
                </Text>
                <Text style={successText}>
                  Your feedback helps other customers make informed decisions and helps providers improve their services.
                </Text>
              </Section>
            </>
          ) : (
            <>
              <Text style={text}>
                The following booking has been marked as completed. Great job!
              </Text>
              <Section style={successSection}>
                <Text style={successText}>
                  <strong>Payment has been processed!</strong>
                </Text>
                <Text style={successText}>
                  Your earnings will be transferred to your bank account according to your payout schedule.
                </Text>
              </Section>
            </>
          )}

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
                <tr>
                  <td style={labelCell}>Duration:</td>
                  <td style={valueCell}>{duration} minutes</td>
                </tr>
                <tr>
                  <td style={labelCell}>Amount:</td>
                  <td style={valueCell}>${(price / 100).toFixed(2)}</td>
                </tr>
                {bookingDate && (
                  <tr>
                    <td style={labelCell}>Completed Date:</td>
                    <td style={valueCell}>{bookingDate}</td>
                  </tr>
                )}
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>{recipientEmail}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {isCustomer && (
            <Section style={ctaSection}>
              <Text style={ctaText}>
                We'd love to hear about your experience:
              </Text>
              <Button
                style={button}
                href={`https://peepopay.com/bookings/${bookingId}/review`}
              >
                Leave a Review
              </Button>
              <Text style={ctaSubtext}>
                Your review will be visible to other customers and helps improve our platform.
              </Text>
            </Section>
          )}

          {!isCustomer && (
            <Section style={ctaSection}>
              <Text style={ctaText}>
                Keep up the excellent work! Check your dashboard for upcoming bookings.
              </Text>
              <Button
                style={button}
                href="https://peepopay.com/dashboard"
              >
                View Dashboard
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {isCustomer
              ? 'Thank you for choosing PeepoPay. We look forward to serving you again!'
              : 'Thank you for being part of the PeepoPay community!'}
          </Text>

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
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

const successSection = {
  margin: '24px 40px',
  backgroundColor: '#f0fdf4',
  border: '2px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
};

const successText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
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

const ctaSubtext = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '12px 0 0',
};

const button = {
  backgroundColor: '#10b981',
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

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '12px 40px',
};
