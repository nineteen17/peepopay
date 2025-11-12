/**
 * Input Sanitization Middleware
 *
 * NOTE: This module requires validator package for full functionality
 * Install with: npm install validator && npm install --save-dev @types/validator
 */

// Uncomment when validator is installed:
// import validator from 'validator';

/**
 * Basic HTML escape function
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Basic email normalization
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize booking input data
 */
export function sanitizeBookingInput(data: any) {
  return {
    ...data,
    customerName: data.customerName ? escapeHtml(data.customerName.trim()) : data.customerName,
    customerEmail: data.customerEmail ? normalizeEmail(data.customerEmail) : data.customerEmail,
    customerPhone: data.customerPhone ? data.customerPhone.trim() : data.customerPhone,
    customerAddress: data.customerAddress ? escapeHtml(data.customerAddress.trim()) : data.customerAddress,
    notes: data.notes ? escapeHtml(data.notes.trim()) : data.notes,
  };

  // Full implementation when validator is available:
  // return {
  //   ...data,
  //   customerName: validator.escape(data.customerName),
  //   customerEmail: validator.normalizeEmail(data.customerEmail) || data.customerEmail,
  //   customerPhone: validator.trim(data.customerPhone),
  //   customerAddress: data.customerAddress ? validator.escape(data.customerAddress) : undefined,
  //   notes: data.notes ? validator.escape(data.notes) : undefined,
  // };
}

/**
 * Sanitize service input data
 */
export function sanitizeServiceInput(data: any) {
  return {
    ...data,
    name: data.name ? escapeHtml(data.name.trim()) : data.name,
    description: data.description ? escapeHtml(data.description.trim()) : data.description,
  };

  // Full implementation when validator is available:
  // return {
  //   ...data,
  //   name: validator.escape(data.name),
  //   description: data.description ? validator.escape(data.description) : undefined,
  // };
}

/**
 * Sanitize availability input data
 */
export function sanitizeAvailabilityInput(data: any) {
  return {
    ...data,
    // Time fields are validated by zod schema, no sanitization needed
  };
}

/**
 * Sanitize blocked slot input data
 */
export function sanitizeBlockedSlotInput(data: any) {
  return {
    ...data,
    reason: data.reason ? escapeHtml(data.reason.trim()) : data.reason,
  };

  // Full implementation when validator is available:
  // return {
  //   ...data,
  //   reason: data.reason ? validator.escape(data.reason) : undefined,
  // };
}

/**
 * Remove potential XSS from string
 */
export function stripXSS(input: string): string {
  // Basic XSS prevention - remove script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
}
