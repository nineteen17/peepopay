import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, } from '@react-email/components';
export const BookingConfirmationEmail = ({ bookingId, serviceName, duration, price, customerEmail, bookingDate, }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsxs(Preview, { children: ["Your booking has been confirmed - ", serviceName] }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Heading, { style: h1, children: "Booking Confirmed!" }), _jsx(Text, { style: text, children: "Thank you for your booking. Your payment has been processed successfully." }), _jsxs(Section, { style: detailsSection, children: [_jsx(Heading, { as: "h2", style: h2, children: "Booking Details" }), _jsx(Hr, { style: hr }), _jsx("table", { style: detailsTable, children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Booking ID:" }), _jsx("td", { style: valueCell, children: bookingId })] }), _jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Service:" }), _jsx("td", { style: valueCell, children: serviceName })] }), _jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Duration:" }), _jsxs("td", { style: valueCell, children: [duration, " minutes"] })] }), _jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Amount Paid:" }), _jsxs("td", { style: valueCell, children: ["$", (price / 100).toFixed(2)] })] }), bookingDate && (_jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Date:" }), _jsx("td", { style: valueCell, children: bookingDate })] })), _jsxs("tr", { children: [_jsx("td", { style: labelCell, children: "Email:" }), _jsx("td", { style: valueCell, children: customerEmail })] })] }) })] }), _jsx(Hr, { style: hr }), _jsx(Text, { style: footer, children: "If you have any questions about your booking, please contact us." }), _jsx(Text, { style: footer, children: "This is an automated email from PeepoPay. Please do not reply to this email." })] }) })] }));
};
BookingConfirmationEmail.PreviewProps = {
    bookingId: 'BK123456789',
    serviceName: 'Premium Consultation',
    duration: 60,
    price: 5000,
    customerEmail: 'customer@example.com',
    bookingDate: 'November 15, 2025 at 2:00 PM',
};
export default BookingConfirmationEmail;
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
const h2 = {
    color: '#333',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 16px',
};
const text = {
    color: '#555',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 24px',
    padding: '0 40px',
    textAlign: 'center',
};
const detailsSection = {
    padding: '0 40px',
    margin: '24px 0',
};
const detailsTable = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '16px 0',
};
const labelCell = {
    padding: '12px 8px 12px 0',
    color: '#666',
    fontSize: '14px',
    fontWeight: '600',
    verticalAlign: 'top',
    width: '40%',
};
const valueCell = {
    padding: '12px 0',
    color: '#333',
    fontSize: '14px',
    verticalAlign: 'top',
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
//# sourceMappingURL=booking-confirmation.js.map