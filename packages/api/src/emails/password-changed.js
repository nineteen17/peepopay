import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr, } from '@react-email/components';
export const PasswordChangedEmail = ({ userName, changedAt, ipAddress, userAgent, supportUrl = 'mailto:support@peepopay.com', }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Your PeepoPay password has been changed" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Heading, { style: h1, children: "Password Changed" }), _jsxs(Text, { style: text, children: ["Hi ", userName, ","] }), _jsxs(Text, { style: text, children: ["This email confirms that your PeepoPay account password was successfully changed on ", _jsx("strong", { children: changedAt }), "."] }), _jsxs(Section, { style: detailsSection, children: [_jsx(Text, { style: detailsTitle, children: "Change Details:" }), _jsx("table", { style: detailsTable, children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Date & Time:" }), _jsx("td", { style: valueCell, children: changedAt })] }), ipAddress && (_jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "IP Address:" }), _jsx("td", { style: valueCell, children: ipAddress })] })), userAgent && (_jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Device/Browser:" }), _jsx("td", { style: valueCell, children: userAgent })] }))] }) })] }), _jsx(Hr, { style: hr }), _jsxs(Section, { style: securitySection, children: [_jsx(Text, { style: securityTitle, children: "\uD83D\uDD12 Security Notice" }), _jsx(Text, { style: securityText, children: _jsx("strong", { children: "Didn't change your password?" }) }), _jsx(Text, { style: securityText, children: "If you did not make this change, your account may have been compromised. Please contact our support team immediately." }), _jsx(Section, { style: ctaSection, children: _jsx(Button, { style: button, href: supportUrl, children: "Contact Support" }) })] }), _jsx(Hr, { style: hr }), _jsxs(Section, { style: tipsSection, children: [_jsx(Text, { style: tipsTitle, children: "Password Security Tips:" }), _jsx(Text, { style: tipText, children: "\u2705 Use a unique password for each account" }), _jsx(Text, { style: tipText, children: "\u2705 Use a password manager" }), _jsx(Text, { style: tipText, children: "\u2705 Enable two-factor authentication when available" }), _jsx(Text, { style: tipText, children: "\u2705 Never share your password with anyone" }), _jsx(Text, { style: tipText, children: "\u2705 Change passwords regularly" })] }), _jsx(Hr, { style: hr }), _jsx(Text, { style: footer, children: "This is an automated security notification from PeepoPay. Please do not reply to this email." })] }) })] }));
};
PasswordChangedEmail.PreviewProps = {
    userName: 'John Smith',
    changedAt: 'November 11, 2025 at 2:30 PM',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome on macOS',
    supportUrl: 'mailto:support@peepopay.com',
};
export default PasswordChangedEmail;
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
    borderCollapse: 'collapse',
    margin: '12px 0',
};
const labelCell = {
    padding: '8px 8px 8px 0',
    color: '#666',
    fontSize: '14px',
    fontWeight: '600',
    verticalAlign: 'top',
    width: '40%',
};
const valueCell = {
    padding: '8px 0',
    color: '#333',
    fontSize: '14px',
    verticalAlign: 'top',
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
    textAlign: 'center',
    margin: '16px 0 0',
};
const button = {
    backgroundColor: '#ef4444',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
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
    textAlign: 'center',
};
//# sourceMappingURL=password-changed.js.map