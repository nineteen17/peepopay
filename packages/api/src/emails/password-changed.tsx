import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface PasswordChangedEmailProps {
  userName: string;
  changedAt: string;
  ipAddress?: string;
  userAgent?: string;
  supportUrl?: string;
}

export const PasswordChangedEmail = ({
  userName,
  changedAt,
  ipAddress,
  userAgent,
  supportUrl = 'mailto:support@peepopay.com',
}: PasswordChangedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your PeepoPay password has been changed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Changed</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            This email confirms that your PeepoPay account password was successfully
            changed on <strong>{changedAt}</strong>.
          </Text>

          <Section style={detailsSection}>
            <Text style={detailsTitle}>Change Details:</Text>
            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Date & Time:</td>
                  <td style={valueCell}>{changedAt}</td>
                </tr>
                {ipAddress && (
                  <tr>
                    <td style={labelCell}>IP Address:</td>
                    <td style={valueCell}>{ipAddress}</td>
                  </tr>
                )}
                {userAgent && (
                  <tr>
                    <td style={labelCell}>Device/Browser:</td>
                    <td style={valueCell}>{userAgent}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          <Section style={securitySection}>
            <Text style={securityTitle}>🔒 Security Notice</Text>
            <Text style={securityText}>
              <strong>Didn't change your password?</strong>
            </Text>
            <Text style={securityText}>
              If you did not make this change, your account may have been compromised.
              Please contact our support team immediately.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href={supportUrl}>
                Contact Support
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={tipsSection}>
            <Text style={tipsTitle}>Password Security Tips:</Text>
            <Text style={tipText}>✅ Use a unique password for each account</Text>
            <Text style={tipText}>✅ Use a password manager</Text>
            <Text style={tipText}>✅ Enable two-factor authentication when available</Text>
            <Text style={tipText}>✅ Never share your password with anyone</Text>
            <Text style={tipText}>✅ Change passwords regularly</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated security notification from PeepoPay.
            Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

PasswordChangedEmail.PreviewProps = {
  userName: 'John Smith',
  changedAt: 'November 11, 2025 at 2:30 PM',
  ipAddress: '192.168.1.100',
  userAgent: 'Chrome on macOS',
  supportUrl: 'mailto:support@peepopay.com',
} as PasswordChangedEmailProps;

export default PasswordChangedEmail;

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

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  padding: '0 40px',
};

const detailsSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const detailsTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '12px 0',
};

const labelCell = {
  padding: '8px 8px 8px 0',
  color: '#666',
  fontSize: '14px',
  fontWeight: '600',
  verticalAlign: 'top' as const,
  width: '40%',
};

const valueCell = {
  padding: '8px 0',
  color: '#333',
  fontSize: '14px',
  verticalAlign: 'top' as const,
};

const securitySection = {
  padding: '20px 40px',
  margin: '24px 0',
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '4px',
};

const securityTitle = {
  color: '#991b1b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const securityText = {
  color: '#7f1d1d',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '16px 0 0',
};

const button = {
  backgroundColor: '#ef4444',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 24px',
};

const tipsSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const tipsTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const tipText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '26px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '8px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};
