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

interface DisputeResolvedEmailProps {
  bookingId: string;
  serviceName: string;
  bookingDate: string;
  resolution: 'customer' | 'provider';
  resolutionNotes?: string;
  refundAmount: number;
  recipientName: string;
  recipientEmail: string;
  recipientType: 'customer' | 'provider';
  customerName: string;
  providerName: string;
}

export const DisputeResolvedEmail = ({
  bookingId,
  serviceName,
  bookingDate,
  resolution,
  resolutionNotes,
  refundAmount,
  recipientName,
  recipientEmail,
  recipientType,
  customerName,
  providerName,
}: DisputeResolvedEmailProps) => {
  const isCustomer = recipientType === 'customer';
  const customerWon = resolution === 'customer';
  const recipientWon = (isCustomer && customerWon) || (!isCustomer && !customerWon);

  // Format refund amount in dollars
  const refundDollars = (refundAmount / 100).toFixed(2);

  return (
    <Html>
      <Head />
      <Preview>
        {recipientWon
          ? 'Dispute Resolved in Your Favor'
          : 'Dispute Resolution Update'}{' '}
        - {serviceName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {recipientWon ? 'Dispute Resolved in Your Favor' : 'Dispute Resolved'}
          </Heading>

          {isCustomer && customerWon && (
            <Section style={successNotice}>
              <Text style={successText}>
                Good news! After reviewing your dispute, we've determined that you are entitled to a full refund.
              </Text>
            </Section>
          )}

          {isCustomer && !customerWon && (
            <Section style={infoNotice}>
              <Text style={infoText}>
                After careful review of your dispute, we've determined that the provider's cancellation policy was applied correctly.
              </Text>
            </Section>
          )}

          {!isCustomer && !customerWon && (
            <Section style={successNotice}>
              <Text style={successText}>
                After reviewing the customer's dispute, we've determined that your cancellation policy was applied correctly.
              </Text>
            </Section>
          )}

          {!isCustomer && customerWon && (
            <Section style={infoNotice}>
              <Text style={infoText}>
                After careful review, we've determined that the customer is entitled to a full refund for this booking.
              </Text>
            </Section>
          )}

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
                  <td style={labelCell}>Booking Date:</td>
                  <td style={valueCell}>{bookingDate}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Customer:</td>
                  <td style={valueCell}>{customerName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Provider:</td>
                  <td style={valueCell}>{providerName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Resolution:</td>
                  <td style={valueCell}>
                    {customerWon ? 'Resolved in Customer Favor' : 'Resolved in Provider Favor'}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {customerWon && refundAmount > 0 && (
            <Section style={refundSection}>
              <Heading as="h2" style={h2}>
                Refund Information
              </Heading>
              <Hr style={hr} />
              <Text style={refundText}>
                <strong>Refund Amount:</strong> ${refundDollars}
              </Text>
              <Text style={refundText}>
                {isCustomer
                  ? 'The full refund will be processed to your original payment method within 5-10 business days.'
                  : `The customer will receive a full refund of $${refundDollars} to their original payment method.`}
              </Text>
            </Section>
          )}

          {resolutionNotes && (
            <Section style={notesSection}>
              <Heading as="h2" style={h2}>
                Resolution Notes
              </Heading>
              <Hr style={hr} />
              <Text style={notesText}>
                {resolutionNotes}
              </Text>
            </Section>
          )}

          {isCustomer && customerWon && (
            <Section style={thankYouSection}>
              <Text style={noticeText}>
                Thank you for your patience while we reviewed your case. We take all disputes seriously and strive to ensure fair outcomes for all parties.
              </Text>
            </Section>
          )}

          {isCustomer && !customerWon && (
            <Section style={thankYouSection}>
              <Text style={noticeText}>
                While we understand this may not be the outcome you hoped for, we carefully reviewed all aspects of your case. The provider's cancellation policy was clearly stated at the time of booking, and the fees were applied according to that policy.
              </Text>
              <Text style={noticeText}>
                We encourage you to review cancellation policies carefully before booking to avoid future issues.
              </Text>
            </Section>
          )}

          {!isCustomer && customerWon && (
            <Section style={thankYouSection}>
              <Text style={noticeText}>
                We understand this is not the ideal outcome. Our review found that the cancellation policy may not have been applied correctly in this case, which is why we've approved the customer's refund request.
              </Text>
              <Text style={noticeText}>
                We recommend reviewing your cancellation policy settings to ensure they're clear and automatically enforced correctly for future bookings.
              </Text>
            </Section>
          )}

          {!isCustomer && !customerWon && (
            <Section style={thankYouSection}>
              <Text style={noticeText}>
                Thank you for maintaining clear cancellation policies. This helps set proper expectations for customers and protects your business from unfair cancellations.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
          </Text>
          <Text style={footer}>
            For questions about this resolution, please contact support@peepopay.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

DisputeResolvedEmail.PreviewProps = {
  bookingId: 'BK123456789',
  serviceName: 'Premium Consultation',
  bookingDate: 'November 15, 2025 at 2:00 PM',
  resolution: 'customer',
  resolutionNotes: 'Customer provided evidence of cancellation well within the free cancellation window. Policy was not correctly applied.',
  refundAmount: 10000,
  recipientName: 'John Doe',
  recipientEmail: 'customer@example.com',
  recipientType: 'customer',
  customerName: 'John Doe',
  providerName: 'Jane Smith',
} as DisputeResolvedEmailProps;

export default DisputeResolvedEmail;

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

const successNotice = {
  margin: '24px 40px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid #86efac',
};

const successText = {
  color: '#166534',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontWeight: '500',
};

const infoNotice = {
  margin: '24px 40px',
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid #93c5fd',
};

const infoText = {
  color: '#1e40af',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontWeight: '500',
};

const refundSection = {
  margin: '24px 0',
  backgroundColor: '#fef9f3',
  borderRadius: '8px',
  padding: '20px 40px',
};

const refundText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
};

const notesSection = {
  margin: '24px 0',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px 40px',
};

const notesText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const thankYouSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const noticeText = {
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
