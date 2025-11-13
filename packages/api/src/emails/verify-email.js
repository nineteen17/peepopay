import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr, Code, } from '@react-email/components';
export const VerifyEmail = ({ userName, verificationUrl, verificationCode, expiresIn = '24 hours', }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Verify your email address to activate your PeepoPay account" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Heading, { style: h1, children: "Verify Your Email" }), _jsxs(Text, { style: text, children: ["Hi ", userName, ","] }), _jsx(Text, { style: text, children: "Thanks for signing up for PeepoPay! To get started, please verify your email address by clicking the button below." }), _jsx(Section, { style: ctaSection, children: _jsx(Button, { style: button, href: verificationUrl, children: "Verify Email Address" }) }), verificationCode && (_jsxs(Section, { style: codeSection, children: [_jsx(Text, { style: codeLabel, children: "Or enter this verification code:" }), _jsx(Code, { style: code, children: verificationCode })] })), _jsx(Hr, { style: hr }), _jsxs(Section, { style: infoSection, children: [_jsxs(Text, { style: infoText, children: ["\u23F0 This link will expire in ", _jsx("strong", { children: expiresIn })] }), _jsx(Text, { style: infoText, children: "\uD83D\uDD12 If you didn't create an account with PeepoPay, you can safely ignore this email." })] }), _jsx(Hr, { style: hr }), _jsx(Text, { style: footer, children: "Having trouble? Copy and paste this URL into your browser:" }), _jsx(Text, { style: urlText, children: verificationUrl }), _jsx(Text, { style: footer, children: "This verification email was sent from PeepoPay. Please do not reply to this email." })] }) })] }));
};
VerifyEmail.PreviewProps = {
    userName: 'John Smith',
    verificationUrl: 'https://peepopay.com/verify-email?token=abc123xyz789',
    verificationCode: '123456',
    expiresIn: '24 hours',
};
export default VerifyEmail;
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
const ctaSection = {
    textAlign: 'center',
    margin: '32px 0',
};
const button = {
    backgroundColor: '#10b981',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '12px 32px',
};
const codeSection = {
    textAlign: 'center',
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
    wordBreak: 'break-all',
};
//# sourceMappingURL=verify-email.js.map