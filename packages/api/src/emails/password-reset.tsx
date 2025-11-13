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

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  resetCode?: string;
  expiresIn?: string;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
  resetCode,
  expiresIn = '1 hour',
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your PeepoPay password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset Your Password</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            We received a request to reset your password for your PeepoPay account.
            Click the button below to choose a new password.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>

          {resetCode && (
            <Section style={codeSection}>
              <Text style={codeLabel}>Or enter this reset code:</Text>
              <Text style={code}>{resetCode}</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={warningSection}>
            <Text style={warningTitle}>⚠️ Important Security Information</Text>
            <Text style={warningText}>
              • This link will expire in <strong>{expiresIn}</strong>
            </Text>
            <Text style={warningText}>
              • If you didn't request this password reset, please ignore this email
            </Text>
            <Text style={warningText}>
              • Your password will remain unchanged until you create a new one
            </Text>
            <Text style={warningText}>
              • Never share this link or code with anyone
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Having trouble? Copy and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{resetUrl}</Text>

          <Text style={footer}>
            This is an automated security email from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

PasswordResetEmail.PreviewProps = {
  userName: 'John Smith',
  resetUrl: 'https://peepopay.com/reset-password?token=abc123xyz789',
  resetCode: '123456',
  expiresIn: '1 hour',
} as PasswordResetEmailProps;

export default PasswordResetEmail;

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

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#ef4444',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const codeSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '0 40px',
};

const codeLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 8px',
};

const code = {
  backgroundColor: '#fef2f2',
  border: '2px solid #fecaca',
  borderRadius: '6px',
  color: '#991b1b',
  fontSize: '28px',
  fontWeight: 'bold',
  letterSpacing: '4px',
  padding: '16px 24px',
  display: 'inline-block',
  margin: '8px 0',
};

const warningSection = {
  padding: '20px 40px',
  margin: '24px 0',
  backgroundColor: '#fffbeb',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '4px',
};

const warningTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const warningText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '6px 0',
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
};

const urlText = {
  color: '#3b82f6',
  fontSize: '11px',
  lineHeight: '16px',
  margin: '4px 0',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
};
