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

interface BookingCancellationEmailProps {
  bookingId: string;
  serviceName: string;
  duration: number;
  price: number;
  recipientEmail: string;
  recipientName: string;
  bookingDate?: string;
  recipientType: 'customer' | 'provider';
  refundAmount?: number;
  refundTimeframe?: string;
  feeCharged?: number;
  policyExplanation?: string;
  hoursUntilBooking?: number;
  cancellationReason?: string;
}

export const BookingCancellationEmail = ({
  bookingId,
  serviceName,
  duration,
  price,
  recipientEmail,
  recipientName,
  bookingDate,
  recipientType,
  refundAmount,
  refundTimeframe = '5-10 business days',
  feeCharged = 0,
  policyExplanation,
  hoursUntilBooking,
  cancellationReason,
}: BookingCancellationEmailProps) => {
  const isCustomer = recipientType === 'customer';
  const hasPartialRefund = feeCharged > 0;

  return (
    <Html>
      <Head />
      <Preview>
        {isCustomer
          ? 'Your booking has been cancelled'
          : 'A booking has been cancelled'}{' '}
        - {serviceName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isCustomer ? 'Booking Cancelled' : 'Booking Cancellation Notice'}
          </Heading>
          <Text style={text}>
            {isCustomer
              ? `Hi ${recipientName}, your booking has been cancelled successfully.`
              : `Hi ${recipientName}, a customer has cancelled their booking.`}
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
                  <td style={labelCell}>Duration:</td>
                  <td style={valueCell}>{duration} minutes</td>
                </tr>
                {bookingDate && (
                  <tr>
                    <td style={labelCell}>Scheduled Date:</td>
                    <td style={valueCell}>{bookingDate}</td>
                  </tr>
                )}
                <tr>
                  <td style={labelCell}>Original Amount:</td>
                  <td style={valueCell}>${(price / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>{recipientEmail}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {isCustomer && refundAmount !== undefined && (
            <Section style={refundSection}>
              <Heading as="h2" style={h2}>
                {refundAmount > 0 ? 'Refund Information' : 'Cancellation Fee'}
              </Heading>
              <Hr style={hr} />

              {/* Fee Breakdown */}
              {hasPartialRefund && (
                <>
                  <table style={breakdownTable}>
                    <tbody>
                      <tr>
                        <td style={breakdownLabel}>Original Deposit:</td>
                        <td style={breakdownValue}>${(price / 100).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={breakdownLabel}>Cancellation Fee:</td>
                        <td style={breakdownValueNegative}>-${(feeCharged / 100).toFixed(2)}</td>
                      </tr>
                      <tr style={breakdownTotal}>
                        <td style={breakdownLabel}><strong>Refund Amount:</strong></td>
                        <td style={breakdownValue}><strong>${(refundAmount / 100).toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                  <Hr style={hr} />
                </>
              )}

              {/* Policy Explanation */}
              {policyExplanation && (
                <>
                  <Section style={policyBox}>
                    <Text style={policyTitle}>📋 Policy Explanation</Text>
                    <Text style={policyText}>{policyExplanation}</Text>
                    {hoursUntilBooking !== undefined && (
                      <Text style={policyText}>
                        You cancelled <strong>{Math.round(hoursUntilBooking)} hours</strong> before your scheduled booking.
                      </Text>
                    )}
                  </Section>
                  <Hr style={hr} />
                </>
              )}

              {/* Refund Details */}
              {refundAmount > 0 ? (
                <>
                  <Text style={refundText}>
                    {hasPartialRefund ? 'Your partial refund' : 'Your full refund'} of{' '}
                    <strong>${(refundAmount / 100).toFixed(2)}</strong> will be processed to your
                    original payment method within {refundTimeframe}.
                  </Text>
                  <Text style={refundText}>
                    You will receive a separate confirmation email from Stripe once the refund has
                    been processed.
                  </Text>
                </>
              ) : (
                <Text style={refundText}>
                  Due to the cancellation policy, no refund is available for this booking.
                  {feeCharged > 0 && ` A fee of $${(feeCharged / 100).toFixed(2)} has been retained.`}
                </Text>
              )}

              {/* Dispute Option for Partial/No Refunds */}
              {(hasPartialRefund || refundAmount === 0) && (
                <Text style={disputeText}>
                  If you believe this was charged in error or have extenuating circumstances,
                  you may contact support to discuss your situation.
                </Text>
              )}
            </Section>
          )}

          {!isCustomer && (
            <Section style={providerNotice}>
              <Text style={providerText}>
                The time slot for this booking is now available. You can accept new bookings for
                this time.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {isCustomer
              ? 'If you have any questions about this cancellation or your refund, please contact us.'
              : 'If you have any questions about this cancellation, please contact support.'}
          </Text>

          <Text style={footer}>
            This is an automated email from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

BookingCancellationEmail.PreviewProps = {
  bookingId: 'BK123456789',
  serviceName: 'Premium Consultation',
  duration: 60,
  price: 5000,
  recipientEmail: 'customer@example.com',
  recipientName: 'John Doe',
  bookingDate: 'November 15, 2025 at 2:00 PM',
  recipientType: 'customer',
  refundAmount: 4000,
  refundTimeframe: '5-10 business days',
  feeCharged: 1000,
  policyExplanation: 'You cancelled outside the free cancellation window. Our policy requires at least 24 hours notice for a full refund. Since you cancelled 12 hours before your booking, a late cancellation fee applies.',
  hoursUntilBooking: 12,
  cancellationReason: 'Late cancellation',
} as BookingCancellationEmailProps;

export default BookingCancellationEmail;

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
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '20px 40px',
};

const refundText = {
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
  margin: '0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const breakdownTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '16px 0',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
};

const breakdownLabel = {
  padding: '8px 16px',
  color: '#666',
  fontSize: '14px',
  textAlign: 'left' as const,
};

const breakdownValue = {
  padding: '8px 16px',
  color: '#333',
  fontSize: '14px',
  fontWeight: '600',
  textAlign: 'right' as const,
};

const breakdownValueNegative = {
  padding: '8px 16px',
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  textAlign: 'right' as const,
};

const breakdownTotal = {
  borderTop: '2px solid #e5e7eb',
};

const policyBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const policyTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const policyText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const disputeText = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '18px',
  margin: '16px 0 0',
  fontStyle: 'italic' as const,
};
