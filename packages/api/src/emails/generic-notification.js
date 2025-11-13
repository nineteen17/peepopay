import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, } from '@react-email/components';
export const GenericNotificationEmail = ({ subject, body, previewText, }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: previewText || subject }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Heading, { style: h1, children: subject }), _jsx(Section, { style: contentSection, children: _jsx(Text, { style: text, children: body }) }), _jsx(Hr, { style: hr }), _jsx(Text, { style: footer, children: "This is an automated email from PeepoPay. Please do not reply to this email." })] }) })] }));
};
GenericNotificationEmail.PreviewProps = {
    subject: 'Notification',
    body: 'This is a sample notification message.',
    previewText: 'You have a new notification',
};
export default GenericNotificationEmail;
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
const contentSection = {
    padding: '0 40px',
    margin: '24px 0',
};
const text = {
    color: '#555',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
};
const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};
const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '16px 0',
    padding: '0 40px',
    textAlign: 'center',
};
//# sourceMappingURL=generic-notification.js.map