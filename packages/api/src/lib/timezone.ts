/**
 * Timezone Utility Module
 *
 * NOTE: This module requires date-fns-tz package
 * Install with: npm install date-fns-tz
 */

// Uncomment when date-fns-tz is installed:
// import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

/**
 * Convert a date from user's timezone to UTC
 * @param date - Date in user's local timezone
 * @param timezone - IANA timezone string (e.g., 'Australia/Sydney')
 * @returns Date in UTC
 */
export function convertToUTC(date: Date, timezone: string): Date {
  // Temporary implementation until date-fns-tz is installed
  // This assumes the date is already in UTC
  return date;

  // Proper implementation when date-fns-tz is available:
  // return zonedTimeToUtc(date, timezone);
}

/**
 * Convert a UTC date to user's timezone
 * @param date - Date in UTC
 * @param timezone - IANA timezone string (e.g., 'Australia/Sydney')
 * @returns Date in user's timezone
 */
export function convertToUserTimezone(date: Date, timezone: string): Date {
  // Temporary implementation until date-fns-tz is installed
  return date;

  // Proper implementation when date-fns-tz is available:
  // return utcToZonedTime(date, timezone);
}

/**
 * Format a date in a specific timezone
 * @param date - Date to format
 * @param timezone - IANA timezone string (e.g., 'Australia/Sydney')
 * @param formatStr - Format string (e.g., 'yyyy-MM-dd HH:mm:ss')
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  formatStr: string
): string {
  // Temporary implementation until date-fns-tz is installed
  return date.toISOString();

  // Proper implementation when date-fns-tz is available:
  // return format(utcToZonedTime(date, timezone), formatStr, { timeZone: timezone });
}

/**
 * Get the default timezone for the application
 */
export const DEFAULT_TIMEZONE = 'Australia/Sydney';

/**
 * Validate timezone string
 * @param timezone - IANA timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to format a date in the timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Parse an ISO date string in a specific timezone
 * @param dateString - ISO date string (e.g., '2024-01-15')
 * @param timezone - IANA timezone string
 * @returns Date object
 */
export function parseDateInTimezone(dateString: string, timezone: string): Date {
  // Temporary implementation
  return new Date(dateString);

  // TODO: Implement proper timezone-aware parsing when date-fns-tz is available
}
