import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr, } from '@react-email/components';
export const WelcomeEmail = ({ userName, userEmail, dashboardUrl = 'http://localhost:3000', }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Welcome to PeepoPay - Start accepting bookings today!" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Heading, { style: h1, children: "Welcome to PeepoPay! \uD83C\uDF89" }), _jsxs(Text, { style: text, children: ["Hi ", userName, ","] }), _jsx(Text, { style: text, children: "Thanks for joining PeepoPay! We're excited to help you streamline your booking process and get paid faster." }), _jsxs(Section, { style: benefitsSection, children: [_jsx(Text, { style: benefitsTitle, children: "What you can do with PeepoPay:" }), _jsx(Text, { style: benefitItem, children: "\u2705 Accept booking deposits 24/7" }), _jsx(Text, { style: benefitItem, children: "\u2705 Manage your availability calendar" }), _jsx(Text, { style: benefitItem, children: "\u2705 Embed booking widget on your website" }), _jsx(Text, { style: benefitItem, children: "\u2705 Get paid directly to your Stripe account" }), _jsx(Text, { style: benefitItem, children: "\u2705 Track all your bookings in one place" })] }), _jsx(Section, { style: ctaSection, children: _jsx(Button, { style: button, href: dashboardUrl, children: "Go to Dashboard" }) }), _jsx(Hr, { style: hr }), _jsxs(Section, { style: nextStepsSection, children: [_jsx(Text, { style: nextStepsTitle, children: "Next Steps:" }), _jsxs(Text, { style: stepText, children: ["1. ", _jsx("strong", { children: "Connect Stripe" }), " - Set up payments in 5 minutes"] }), _jsxs(Text, { style: stepText, children: ["2. ", _jsx("strong", { children: "Create Services" }), " - Add your offerings and pricing"] }), _jsxs(Text, { style: stepText, children: ["3. ", _jsx("strong", { children: "Set Availability" }), " - Configure your working hours"] }), _jsxs(Text, { style: stepText, children: ["4. ", _jsx("strong", { children: "Embed Widget" }), " - Add booking to your website"] })] }), _jsx(Hr, { style: hr }), _jsxs(Text, { style: footer, children: ["Need help getting started? Check out our", ' ', _jsx("a", { href: `${dashboardUrl}/docs`, style: link, children: "documentation" }), ' ', "or reply to this email."] }), _jsxs(Text, { style: footer, children: ["You're receiving this because you created an account at PeepoPay with ", userEmail, "."] })] }) })] }));
};
WelcomeEmail.PreviewProps = {
    userName: 'John Smith',
    userEmail: 'john@example.com',
    dashboardUrl: 'https://peepopay.com/dashboard',
};
export default WelcomeEmail;
// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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
    textAlign: 'center',
};
const text = {
    color: '#555',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
    padding: '0 40px',
};
const benefitsSection = {
    padding: '0 40px',
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
    textAlign: 'center',
    margin: '32px 0',
};
const button = {
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
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
//# sourceMappingURL=welcome-email.js.map