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

interface DisputeCreatedEmailProps {
  bookingId: string;
  serviceName: string;
  bookingDate: string;
  disputeReason: string;
  recipientName: string;
  recipientEmail: string;
  recipientType: 'customer' | 'provider';
  customerName: string;
  providerName: string;
}

export const DisputeCreatedEmail = ({
  bookingId,
  serviceName,
  bookingDate,
  disputeReason,
  recipientName,
  recipientEmail,
  recipientType,
  customerName,
  providerName,
}: DisputeCreatedEmailProps) => {
  const isCustomer = recipientType === 'customer';

  return (
    <Html>
      <Head />
      <Preview>
        {isCustomer
          ? 'Dispute Received - We\'re Reviewing Your Case'
          : 'Customer Dispute Filed'}{' '}
        - {serviceName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isCustomer ? 'Dispute Received' : 'Customer Dispute Filed'}
          </Heading>
          <Text style={text}>
            {isCustomer
              ? `Hi ${recipientName}, we've received your dispute for booking ${bookingId}. Our team will review your case and respond as soon as possible.`
              : `Hi ${recipientName}, ${customerName} has filed a dispute for booking ${bookingId}. Our team will review the case and notify you of the outcome.`}
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
              </tbody>
            </table>
          </Section>

          <Section style={disputeSection}>
            <Heading as="h2" style={h2}>
              Dispute Reason
            </Heading>
            <Hr style={hr} />
            <Text style={disputeText}>
              {disputeReason}
            </Text>
          </Section>

          {isCustomer ? (
            <Section style={customerNotice}>
              <Heading as="h2" style={h2}>
                What Happens Next
              </Heading>
              <Hr style={hr} />
              <Text style={noticeText}>
                Our support team will review your dispute within 2-3 business days. We'll examine:
              </Text>
              <ul style={list}>
                <li style={listItem}>The service's cancellation policy at the time of booking</li>
                <li style={listItem}>The timing of your cancellation</li>
                <li style={listItem}>Any applicable fees or refund amounts</li>
                <li style={listItem}>Your dispute reason and any supporting details</li>
              </ul>
              <Text style={noticeText}>
                You'll receive an email notification when the dispute is resolved. If we need any additional information, we'll contact you at {recipientEmail}.
              </Text>
            </Section>
          ) : (
            <Section style={providerNotice}>
              <Heading as="h2" style={h2}>
                What Happens Next
              </Heading>
              <Hr style={hr} />
              <Text style={noticeText}>
                Our support team will review this dispute within 2-3 business days. We'll examine:
              </Text>
              <ul style={list}>
                <li style={listItem}>Your service's cancellation policy at the time of booking</li>
                <li style={listItem}>The customer's cancellation timing</li>
                <li style={listItem}>Fees charged and refund amounts</li>
                <li style={listItem}>The customer's dispute reason</li>
              </ul>
              <Text style={noticeText}>
                You'll receive an email notification when the dispute is resolved. If we need any additional information from you, we'll contact you at {recipientEmail}.
              </Text>
              <Text style={noticeText}>
                <strong>Note:</strong> No action is required from you at this time. Our team will handle the review process.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
          </Text>
          <Text style={footer}>
            For questions about this dispute, please contact support@peepopay.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

DisputeCreatedEmail.PreviewProps = {
  bookingId: 'BK123456789',
  serviceName: 'Premium Consultation',
  bookingDate: 'November 15, 2025 at 2:00 PM',
  disputeReason: 'I cancelled 48 hours in advance but was still charged a late cancellation fee. The policy states free cancellation within 24 hours.',
  recipientName: 'John Doe',
  recipientEmail: 'customer@example.com',
  recipientType: 'customer',
  customerName: 'John Doe',
  providerName: 'Jane Smith',
} as DisputeCreatedEmailProps;

export default DisputeCreatedEmail;

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

const disputeSection = {
  margin: '24px 0',
  backgroundColor: '#fef9f3',
  borderRadius: '8px',
  padding: '20px 40px',
};

const disputeText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const customerNotice = {
  margin: '24px 0',
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px 40px',
};

const providerNotice = {
  margin: '24px 0',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px 40px',
};

const noticeText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
};

const list = {
  margin: '0 0 12px',
  paddingLeft: '20px',
};

const listItem = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};
