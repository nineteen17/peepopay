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

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  dashboardUrl?: string;
}

export const WelcomeEmail = ({
  userName,
  userEmail,
  dashboardUrl = 'http://localhost:3000',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to PeepoPay - Start accepting bookings today!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to PeepoPay! 🎉</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            Thanks for joining PeepoPay! We're excited to help you streamline your booking
            process and get paid faster.
          </Text>

          <Section style={benefitsSection}>
            <Text style={benefitsTitle}>What you can do with PeepoPay:</Text>
            <Text style={benefitItem}>✅ Accept booking deposits 24/7</Text>
            <Text style={benefitItem}>✅ Manage your availability calendar</Text>
            <Text style={benefitItem}>✅ Embed booking widget on your website</Text>
            <Text style={benefitItem}>✅ Get paid directly to your Stripe account</Text>
            <Text style={benefitItem}>✅ Track all your bookings in one place</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={nextStepsSection}>
            <Text style={nextStepsTitle}>Next Steps:</Text>
            <Text style={stepText}>
              1. <strong>Connect Stripe</strong> - Set up payments in 5 minutes
            </Text>
            <Text style={stepText}>
              2. <strong>Create Services</strong> - Add your offerings and pricing
            </Text>
            <Text style={stepText}>
              3. <strong>Set Availability</strong> - Configure your working hours
            </Text>
            <Text style={stepText}>
              4. <strong>Embed Widget</strong> - Add booking to your website
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Need help getting started? Check out our{' '}
            <a href={`${dashboardUrl}/docs`} style={link}>
              documentation
            </a>{' '}
            or reply to this email.
          </Text>

          <Text style={footer}>
            You're receiving this because you created an account at PeepoPay with {userEmail}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

WelcomeEmail.PreviewProps = {
  userName: 'John Smith',
  userEmail: 'john@example.com',
  dashboardUrl: 'https://peepopay.com/dashboard',
} as WelcomeEmailProps;

export default WelcomeEmail;

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

const benefitsSection = {
  margin: '24px 0',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px 40px',
};

const benefitsTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const benefitItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '4px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const nextStepsSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const nextStepsTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const stepText = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
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

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};
