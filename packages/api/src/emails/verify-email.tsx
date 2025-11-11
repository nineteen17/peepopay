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
  Code,
} from '@react-email/components';
import * as React from 'react';

interface VerifyEmailProps {
  userName: string;
  verificationUrl: string;
  verificationCode?: string;
  expiresIn?: string;
}

export const VerifyEmail = ({
  userName,
  verificationUrl,
  verificationCode,
  expiresIn = '24 hours',
}: VerifyEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address to activate your PeepoPay account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Verify Your Email</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            Thanks for signing up for PeepoPay! To get started, please verify your email
            address by clicking the button below.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>
          </Section>

          {verificationCode && (
            <Section style={codeSection}>
              <Text style={codeLabel}>Or enter this verification code:</Text>
              <Code style={code}>{verificationCode}</Code>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={infoSection}>
            <Text style={infoText}>
              ⏰ This link will expire in <strong>{expiresIn}</strong>
            </Text>
            <Text style={infoText}>
              🔒 If you didn't create an account with PeepoPay, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Having trouble? Copy and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{verificationUrl}</Text>

          <Text style={footer}>
            This verification email was sent from PeepoPay. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

VerifyEmail.PreviewProps = {
  userName: 'John Smith',
  verificationUrl: 'https://peepopay.com/verify-email?token=abc123xyz789',
  verificationCode: '123456',
  expiresIn: '24 hours',
} as VerifyEmailProps;

export default VerifyEmail;

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
  backgroundColor: '#10b981',
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
  backgroundColor: '#f4f4f5',
  borderRadius: '6px',
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  letterSpacing: '4px',
  padding: '16px 24px',
  display: 'inline-block',
  margin: '8px 0',
};

const infoSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const infoText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
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
