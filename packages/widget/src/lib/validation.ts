import { z } from 'zod';

/**
 * Customer form validation schema
 * Matches API requirements for NewBooking
 */
export const customerFormSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  customerEmail: z
    .string()
    .email('Please enter a valid email address')
    .trim(),

  customerPhone: z
    .string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number')
    .trim(),

  customerAddress: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

/**
 * Validate customer form data
 */
export function validateCustomerForm(data: unknown) {
  return customerFormSchema.safeParse(data);
}

/**
 * Get field-specific error message
 */
export function getFieldError(
  result: z.SafeParseReturnType<unknown, unknown>,
  fieldName: string
): string | undefined {
  if (!result.success) {
    const fieldError = result.error.errors.find((err) => err.path[0] === fieldName);
    return fieldError?.message;
  }
  return undefined;
}
