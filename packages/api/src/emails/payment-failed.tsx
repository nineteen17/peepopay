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
} from '@react-email/components';
import * as React from 'react';

interface PaymentFailedEmailProps {
  bookingId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  amount: number;
  failureReason?: string;
}

export const PaymentFailedEmail = ({
  bookingId,
  serviceName,
  customerName,
  customerEmail,
  bookingDate,
  amount,
  failureReason = 'Payment was declined',
}: PaymentFailedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Payment Failed - {serviceName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Failed</Heading>

          <Text style={text}>
            Hi {customerName}, we were unable to process your payment for the booking below.
          </Text>

          <Section style={warningSection}>
            <Text style={warningText}>
              <strong>Reason:</strong> {failureReason}
            </Text>
            <Text style={warningText}>
              Don't worry - no charges have been made to your account.
            </Text>
          </Section>

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
                  <td style={labelCell}>Amount:</td>
                  <td style={valueCell}>${(amount / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>{customerEmail}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={ctaSection}>
            <Text style={ctaText}>
              To secure your booking, please try booking again with a different payment method.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={helpText}>
            <strong>Common reasons for payment failure:</strong>
          </Text>
          <ul style={listStyle}>
            <li style={listItem}>Insufficient funds in your account</li>
            <li style={listItem}>Incorrect card details</li>
            <li style={listItem}>Card expired or blocked by your bank</li>
            <li style={listItem}>International payments not enabled</li>
          </ul>

          <Text style={footer}>
            If you continue to experience issues or need assistance, please contact our support team.
          </Text>

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

PaymentFailedEmail.PreviewProps = {
  bookingId: 'BK123456789',
  serviceName: 'Premium Plumbing Service',
  customerName: 'John Doe',
  customerEmail: 'john.doe@example.com',
  bookingDate: 'November 20, 2025 at 2:00 PM',
  amount: 5000,
  failureReason: 'Your card was declined',
} as PaymentFailedEmailProps;

export default PaymentFailedEmail;

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
  color: '#dc2626',
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

const warningSection = {
  margin: '24px 0',
  backgroundColor: '#fef2f2',
  border: '2px solid #fca5a5',
  borderRadius: '8px',
  padding: '20px 40px',
};

const warningText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
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

const ctaSection = {
  margin: '32px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px',
  fontWeight: '500',
};

const helpText = {
  color: '#333',
  fontSize: '14px',
  margin: '24px 0 12px',
  padding: '0 40px',
};

const listStyle = {
  margin: '0',
  padding: '0 40px 0 60px',
};

const listItem = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};
