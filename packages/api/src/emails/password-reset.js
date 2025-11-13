import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr, Code, } from '@react-email/components';
export const PasswordResetEmail = ({ userName, resetUrl, resetCode, expiresIn = '1 hour', }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Reset your PeepoPay password" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Heading, { style: h1, children: "Reset Your Password" }), _jsxs(Text, { style: text, children: ["Hi ", userName, ","] }), _jsx(Text, { style: text, children: "We received a request to reset your password for your PeepoPay account. Click the button below to choose a new password." }), _jsx(Section, { style: ctaSection, children: _jsx(Button, { style: button, href: resetUrl, children: "Reset Password" }) }), resetCode && (_jsxs(Section, { style: codeSection, children: [_jsx(Text, { style: codeLabel, children: "Or enter this reset code:" }), _jsx(Code, { style: code, children: resetCode })] })), _jsx(Hr, { style: hr }), _jsxs(Section, { style: warningSection, children: [_jsx(Text, { style: warningTitle, children: "\u26A0\uFE0F Important Security Information" }), _jsxs(Text, { style: warningText, children: ["\u2022 This link will expire in ", _jsx("strong", { children: expiresIn })] }), _jsx(Text, { style: warningText, children: "\u2022 If you didn't request this password reset, please ignore this email" }), _jsx(Text, { style: warningText, children: "\u2022 Your password will remain unchanged until you create a new one" }), _jsx(Text, { style: warningText, children: "\u2022 Never share this link or code with anyone" })] }), _jsx(Hr, { style: hr }), _jsx(Text, { style: footer, children: "Having trouble? Copy and paste this URL into your browser:" }), _jsx(Text, { style: urlText, children: resetUrl }), _jsx(Text, { style: footer, children: "This is an automated security email from PeepoPay. Please do not reply to this email." })] }) })] }));
};
PasswordResetEmail.PreviewProps = {
    userName: 'John Smith',
    resetUrl: 'https://peepopay.com/reset-password?token=abc123xyz789',
    resetCode: '123456',
    expiresIn: '1 hour',
};
export default PasswordResetEmail;
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
    backgroundColor: '#ef4444',
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
    wordBreak: 'break-all',
};
//# sourceMappingURL=password-reset.js.map