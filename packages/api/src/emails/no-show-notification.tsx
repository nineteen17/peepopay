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
} from '@react-email/components';
import * as React from 'react';

interface NoShowNotificationEmailProps {
  bookingId: string;
  serviceName: string;
  bookingDate: string;
  feeCharged: number;
  recipientName: string;
  recipientEmail: string;
  recipientType: 'customer' | 'provider';
}

export const NoShowNotificationEmail = ({
  bookingId,
  serviceName,
  bookingDate,
  feeCharged,
  recipientName,
  recipientEmail,
  recipientType,
}: NoShowNotificationEmailProps) => {
  const isCustomer = recipientType === 'customer';

  return (
    <Html>
      <Head />
      <Preview>
        {isCustomer
          ? 'No-Show Fee Notice'
          : 'Customer No-Show Notice'}{' '}
        - {serviceName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isCustomer ? 'No-Show Fee Notice' : 'Customer No-Show'}
          </Heading>
          <Text style={text}>
            {isCustomer
              ? `Hi ${recipientName}, unfortunately you did not attend your scheduled booking. A no-show fee has been charged.`
              : `Hi ${recipientName}, a customer did not attend their scheduled booking.`}
          </Text>

          <Section style={detailsSection}>
            <Heading as="h2" style={h2}>
              Booking Details
            </Heading>
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
                  <td style={labelCell}>Scheduled Date:</td>
                  <td style={valueCell}>{bookingDate}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>{recipientEmail}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {isCustomer && (
            <Section style={feeSection}>
              <Heading as="h2" style={h2}>
                No-Show Fee
              </Heading>
              <Hr style={hr} />
              <Text style={feeText}>
                A no-show fee of <strong>${(feeCharged / 100).toFixed(2)}</strong> has been
                charged from your deposit according to the service's cancellation policy.
              </Text>
              <Text style={feeText}>
                If you believe this was marked in error or have extenuating circumstances,
                please contact support as soon as possible to discuss your situation.
              </Text>
            </Section>
          )}

          {!isCustomer && (
            <Section style={providerNotice}>
              <Heading as="h2" style={h2}>
                No-Show Fee Retained
              </Heading>
              <Hr style={hr} />
              <Text style={providerText}>
                The no-show fee of <strong>${(feeCharged / 100).toFixed(2)}</strong> has been
                retained according to your cancellation policy.
              </Text>
              <Text style={providerText}>
                The time slot is now available for new bookings.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {isCustomer
              ? 'To avoid no-show fees in the future, please cancel bookings at least 2 hours before the scheduled time.'
              : 'This notification is sent automatically when a customer does not show up for their booking.'}
          </Text>

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

NoShowNotificationEmail.PreviewProps = {
  bookingId: 'BK123456789',
  serviceName: 'Premium Consultation',
  bookingDate: 'November 15, 2025 at 2:00 PM',
  feeCharged: 5000,
  recipientName: 'John Doe',
  recipientEmail: 'customer@example.com',
  recipientType: 'customer',
} as NoShowNotificationEmailProps;

export default NoShowNotificationEmail;

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
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const detailsSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '16px 0',
};

const labelCell = {
  padding: '12px 8px 12px 0',
  color: '#666',
  fontSize: '14px',
  fontWeight: '600',
  verticalAlign: 'top' as const,
  width: '40%',
};

const valueCell = {
  padding: '12px 0',
  color: '#333',
  fontSize: '14px',
  verticalAlign: 'top' as const,
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const feeSection = {
  margin: '24px 0',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px 40px',
};

const feeText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
};

const providerNotice = {
  margin: '24px 0',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px 40px',
};

const providerText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};
