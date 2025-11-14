import {
  Body,
  Button,
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

interface OnboardingReminderEmailProps {
  userName: string;
  userEmail: string;
  onboardingUrl: string;
  daysWaiting: number;
}

export const OnboardingReminderEmail = ({
  userName,
  userEmail,
  onboardingUrl,
  daysWaiting,
}: OnboardingReminderEmailProps) => {
  const urgencyLevel = daysWaiting >= 7 ? 'high' : daysWaiting >= 3 ? 'medium' : 'low';

  const getMessage = () => {
    if (daysWaiting >= 7) {
      return "It's been a week since you started your PeepoPay journey. Complete your setup to start accepting bookings!";
    } else if (daysWaiting >= 3) {
      return "You're just one step away from accepting bookings on PeepoPay. Let's finish your setup!";
    } else {
      return "Welcome to PeepoPay! Complete your payment setup to start receiving bookings.";
    }
  };

  return (
    <Html>
      <Head />
      <Preview>
        Complete your PeepoPay setup to start accepting bookings
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🚀 Complete Your Setup</Heading>

          <Text style={text}>
            Hi {userName},
          </Text>

          <Text style={text}>
            {getMessage()}
          </Text>

          <Section style={urgencyLevel === 'high' ? urgentSection : urgencyLevel === 'medium' ? mediumSection : infoSection}>
            <Text style={urgencyLevel === 'high' ? urgentText : urgencyLevel === 'medium' ? mediumText : infoText}>
              <strong>
                {urgencyLevel === 'high' ? '⚠️ Action Required' : urgencyLevel === 'medium' ? '⏰ Almost There!' : '💡 Quick Setup'}
              </strong>
            </Text>
            <Text style={urgencyLevel === 'high' ? urgentText : urgencyLevel === 'medium' ? mediumText : infoText}>
              You need to complete your Stripe payment setup to start accepting bookings and receiving payments.
            </Text>
          </Section>

          <Section style={benefitsSection}>
            <Heading as="h2" style={h2}>Why Complete Your Setup?</Heading>
            <Hr style={hr} />
            <ul style={listStyle}>
              <li style={listItem}>
                <strong>💰 Start Earning:</strong> Accept bookings and receive payments directly to your bank account
              </li>
              <li style={listItem}>
                <strong>🎯 Get Discovered:</strong> Appear in search results for customers looking for your services
              </li>
              <li style={listItem}>
                <strong>🔒 Secure Payments:</strong> All transactions are processed securely through Stripe
              </li>
              <li style={listItem}>
                <strong>📊 Track Everything:</strong> Monitor your bookings, earnings, and customer reviews in one place
              </li>
              <li style={listItem}>
                <strong>⚡ Quick Setup:</strong> The payment setup takes just 5-10 minutes
              </li>
            </ul>
          </Section>

          <Section style={ctaSection}>
            <Text style={ctaText}>
              Ready to start accepting bookings?
            </Text>
            <Button
              style={button}
              href={onboardingUrl}
            >
              Complete Setup Now
            </Button>
            <Text style={ctaSubtext}>
              This usually takes less than 10 minutes
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={stepsSection}>
            <Heading as="h3" style={h3}>What Happens Next?</Heading>
            <ol style={orderedListStyle}>
              <li style={listItem}>Click the button above to continue your Stripe setup</li>
              <li style={listItem}>Complete your business information and bank details</li>
              <li style={listItem}>Verify your identity (required by Stripe for security)</li>
              <li style={listItem}>Start accepting bookings immediately!</li>
            </ol>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>Need help?</strong> If you have any questions about the setup process,
            please don't hesitate to contact our support team. We're here to help you succeed!
          </Text>

          <Text style={footer}>
            Account: {userEmail}
          </Text>

          <Text style={footer}>
            This is an automated reminder from PeepoPay. If you've already completed your setup,
            you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

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
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px',
};

const h3 = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '16px 0 8px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
};

const infoSection = {
  margin: '24px 40px',
  backgroundColor: '#eff6ff',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
};

const infoText = {
  color: '#1e40af',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const mediumSection = {
  margin: '24px 40px',
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
};

const mediumText = {
  color: '#92400e',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const urgentSection = {
  margin: '24px 40px',
  backgroundColor: '#fee2e2',
  border: '2px solid #ef4444',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
};

const urgentText = {
  color: '#991b1b',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const benefitsSection = {
  margin: '32px 40px',
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const listStyle = {
  margin: '8px 0',
  padding: '0 0 0 20px',
};

const orderedListStyle = {
  margin: '8px 0',
  padding: '0 0 0 24px',
};

const listItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const ctaSection = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#333',
  fontSize: '18px',
  lineHeight: '24px',
  margin: '0 0 20px',
  fontWeight: '600',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
  margin: '0 auto',
};

const ctaSubtext = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0 0',
};

const stepsSection = {
  margin: '24px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '12px 40px',
};
