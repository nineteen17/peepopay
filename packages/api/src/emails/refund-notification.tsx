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

interface RefundNotificationEmailProps {
  bookingId: string;
  serviceName: string;
  bookingDate: string;
  refundAmount: number;
  cancellationReason: string;
  customerName: string;
  customerEmail: string;
}

export const RefundNotificationEmail = ({
  bookingId,
  serviceName,
  bookingDate,
  refundAmount,
  cancellationReason,
  customerName,
  customerEmail,
}: RefundNotificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Refund Processed - {serviceName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Refund Processed</Heading>
          <Text style={text}>
            Hi {customerName}, your refund has been successfully processed for your cancelled
            booking.
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
                  <td style={valueCell}>{customerEmail}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={refundSection}>
            <Heading as="h2" style={h2}>
              Refund Information
            </Heading>
            <Hr style={hr} />
            <Text style={refundText}>
              <strong>Refund Amount: ${(refundAmount / 100).toFixed(2)}</strong>
            </Text>
            <Text style={refundText}>
              <strong>Reason:</strong> {cancellationReason}
            </Text>
            <Text style={refundText}>
              The refund has been issued to your original payment method. Depending on your bank
              or card provider, it may take 5-10 business days for the funds to appear in your
              account.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions about this refund, please contact our support team.
          </Text>

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

RefundNotificationEmail.PreviewProps = {
  bookingId: 'BK123456789',
  serviceName: 'Premium Consultation',
  bookingDate: 'November 15, 2025 at 2:00 PM',
  refundAmount: 7000,
  cancellationReason: 'Cancelled within free cancellation window - full refund',
  customerName: 'John Doe',
  customerEmail: 'customer@example.com',
} as RefundNotificationEmailProps;

export default RefundNotificationEmail;

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

const refundSection = {
  margin: '24px 0',
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px 40px',
};

const refundText = {
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
