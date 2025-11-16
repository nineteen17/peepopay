/**
 * OpenAPI Generator
 *
 * Generates OpenAPI 3.0 specification from Zod schemas
 * Run: npm run generate:openapi
 */

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Define OpenAPI-compatible schemas based on the database schemas
const serviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  duration: z.number(),
  depositAmount: z.number(),
  depositType: z.enum(['percentage', 'fixed']),
  depositPercentage: z.number().nullable(),
  fullPrice: z.number().nullable(),
  isActive: z.boolean().nullable(),
  requiresApproval: z.boolean().nullable(),
  // Refund Policy Fields
  cancellationWindowHours: z.number().nullable(),
  lateCancellationFee: z.number().nullable(),
  noShowFee: z.number().nullable(),
  allowPartialRefunds: z.boolean().nullable(),
  autoRefundOnCancel: z.boolean().nullable(),
  minimumCancellationHours: z.number().nullable(),
  // Flex Pass Fields
  flexPassEnabled: z.boolean().nullable(),
  flexPassPrice: z.number().nullable(),
  flexPassRevenueSharePercent: z.number().nullable(),
  flexPassRulesJson: z.any().nullable(),
  // Protection Addons
  protectionAddons: z.any().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi({ description: 'Service entity' });

const newServiceSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  duration: z.number().min(15).max(480),
  depositAmount: z.number().min(100),
  depositType: z.enum(['percentage', 'fixed']).optional(),
  depositPercentage: z.number().min(1).max(100).optional(),
  fullPrice: z.number().min(100).optional(),
  isActive: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  // Refund Policy Fields
  cancellationWindowHours: z.number().min(1).max(168).optional(),
  lateCancellationFee: z.number().min(0).optional(),
  noShowFee: z.number().min(0).optional(),
  allowPartialRefunds: z.boolean().optional(),
  autoRefundOnCancel: z.boolean().optional(),
  minimumCancellationHours: z.number().min(0).max(48).optional(),
  // Flex Pass Fields
  flexPassEnabled: z.boolean().optional(),
  flexPassPrice: z.number().min(0).optional(),
  flexPassRevenueSharePercent: z.number().min(60).max(70).optional(),
  flexPassRulesJson: z.any().optional(),
  // Protection Addons
  protectionAddons: z.any().optional(),
}).openapi({ description: 'Service creation payload' });

const bookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  customerAddress: z.string().nullable(),
  bookingDate: z.string(),
  duration: z.number(),
  notes: z.string().nullable(),
  depositAmount: z.number(),
  depositStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'refunded']),
  stripePaymentIntentId: z.string().nullable(),
  stripeClientSecret: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi({ description: 'Booking entity' });

const newBookingSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  customerAddress: z.string().max(500).optional(),
  bookingDate: z.string(),
  notes: z.string().max(1000).optional(),
}).openapi({ description: 'Booking creation payload' });

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  slug: z.string(),
  stripeAccountId: z.string().nullable(),
  stripeOnboardingComplete: z.boolean(),
  businessName: z.string().nullable(),
  businessAddress: z.string().nullable(),
  businessPhone: z.string().nullable(),
  businessWebsite: z.string().nullable(),
  industryVertical: z.string().nullable(),
  industrySubcategory: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi({ description: 'User entity' });

// Register component schemas
registry.register('Booking', bookingSchema);
registry.register('NewBooking', newBookingSchema);
registry.register('Service', serviceSchema);
registry.register('NewService', newServiceSchema);
registry.register('User', userSchema);

// Error response schema
const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
}).openapi({ description: 'Error response' });

registry.register('Error', errorResponseSchema);

// ==================== AUTH ENDPOINTS ====================

// POST /api/auth/login
registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Authentication'],
  summary: 'Login with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({
            user: userSchema,
          }),
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/auth/register
registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Authentication'],
  summary: 'Register new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(6),
            name: z.string().min(2).max(100),
            slug: z.string().min(3).max(50),
            industryVertical: z.string().optional(),
            industrySubcategory: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Registration successful',
      content: {
        'application/json': {
          schema: z.object({
            user: userSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid request or user already exists',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/auth/logout
registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Authentication'],
  summary: 'Logout current user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
  },
});

// GET /api/auth/google
registry.registerPath({
  method: 'get',
  path: '/api/auth/google',
  tags: ['Authentication'],
  summary: 'Google OAuth redirect',
  responses: {
    302: {
      description: 'Redirect to Google OAuth',
    },
  },
});

// ==================== USER ENDPOINTS ====================

// GET /api/users/me
registry.registerPath({
  method: 'get',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            user: userSchema,
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// PUT /api/users/me
registry.registerPath({
  method: 'put',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Update user profile',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(2).max(100).optional(),
            slug: z.string().min(3).max(50).optional(),
            businessName: z.string().max(200).optional(),
            businessAddress: z.string().max(500).optional(),
            businessPhone: z.string().max(20).optional(),
            businessWebsite: z.string().url().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            user: userSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/users/stripe/onboard
registry.registerPath({
  method: 'post',
  path: '/api/users/stripe/onboard',
  tags: ['Users'],
  summary: 'Start Stripe onboarding process',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Onboarding URL generated successfully',
      content: {
        'application/json': {
          schema: z.object({
            url: z.string().url(),
          }),
        },
      },
    },
    400: {
      description: 'User already onboarded or invalid request',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ==================== SERVICE ENDPOINTS ====================

// GET /api/services (authenticated)
registry.registerPath({
  method: 'get',
  path: '/api/services',
  tags: ['Services'],
  summary: 'Get all services for authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Services retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            services: z.array(serviceSchema),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// GET /api/services/user/:slug (public)
registry.registerPath({
  method: 'get',
  path: '/api/services/user/{slug}',
  tags: ['Services'],
  summary: 'Get active services by user slug (public)',
  request: {
    params: z.object({
      slug: z.string().describe('User slug or business name'),
    }),
  },
  responses: {
    200: {
      description: 'Services retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            services: z.array(serviceSchema),
          }),
        },
      },
    },
  },
});

// GET /api/services/:id (public)
registry.registerPath({
  method: 'get',
  path: '/api/services/{id}',
  tags: ['Services'],
  summary: 'Get single service by ID',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Service retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            service: serviceSchema,
          }),
        },
      },
    },
    404: {
      description: 'Service not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/services (authenticated)
registry.registerPath({
  method: 'post',
  path: '/api/services',
  tags: ['Services'],
  summary: 'Create a new service',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: newServiceSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Service created successfully',
      content: {
        'application/json': {
          schema: z.object({
            service: serviceSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// PUT /api/services/:id (authenticated)
registry.registerPath({
  method: 'put',
  path: '/api/services/{id}',
  tags: ['Services'],
  summary: 'Update a service',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: newServiceSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Service updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            service: serviceSchema,
          }),
        },
      },
    },
    404: {
      description: 'Service not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// DELETE /api/services/:id (authenticated)
registry.registerPath({
  method: 'delete',
  path: '/api/services/{id}',
  tags: ['Services'],
  summary: 'Delete a service',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Service deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Service not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ==================== BOOKING ENDPOINTS ====================

// GET /api/bookings (authenticated)
registry.registerPath({
  method: 'get',
  path: '/api/bookings',
  tags: ['Bookings'],
  summary: 'Get all bookings for authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      status: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Bookings retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            bookings: z.array(bookingSchema),
          }),
        },
      },
    },
  },
});

// GET /api/bookings/:id (authenticated)
registry.registerPath({
  method: 'get',
  path: '/api/bookings/{id}',
  tags: ['Bookings'],
  summary: 'Get single booking by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Booking retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            booking: bookingSchema,
          }),
        },
      },
    },
    404: {
      description: 'Booking not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/bookings (public - from widget)
registry.registerPath({
  method: 'post',
  path: '/api/bookings',
  tags: ['Bookings'],
  summary: 'Create a booking (public endpoint for widget)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: newBookingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Booking created successfully',
      content: {
        'application/json': {
          schema: z.object({
            booking: bookingSchema,
            clientSecret: z.string().describe('Stripe payment intent client secret'),
          }),
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/bookings/:id/status (authenticated)
registry.registerPath({
  method: 'patch',
  path: '/api/bookings/{id}/status',
  tags: ['Bookings'],
  summary: 'Update booking status',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'refunded']),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Booking status updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            booking: bookingSchema,
          }),
        },
      },
    },
    404: {
      description: 'Booking not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/bookings/:id/cancel (authenticated)
registry.registerPath({
  method: 'post',
  path: '/api/bookings/{id}/cancel',
  tags: ['Bookings'],
  summary: 'Cancel a booking',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Booking cancelled successfully',
      content: {
        'application/json': {
          schema: z.object({
            booking: bookingSchema,
          }),
        },
      },
    },
    404: {
      description: 'Booking not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ==================== HEALTH ENDPOINT ====================

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Health check endpoint',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('healthy'),
            timestamp: z.string(),
            services: z.object({
              database: z.object({
                status: z.enum(['up', 'down']),
                responseTime: z.number().optional(),
                error: z.string().optional(),
              }),
              redis: z.object({
                status: z.enum(['up', 'down']),
                responseTime: z.number().optional(),
                error: z.string().optional(),
              }),
              rabbitmq: z.object({
                status: z.enum(['up', 'down']),
                responseTime: z.number().optional(),
                error: z.string().optional(),
              }),
            }),
          }),
        },
      },
    },
    503: {
      description: 'Service is unhealthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('unhealthy'),
            timestamp: z.string(),
            services: z.any(),
          }),
        },
      },
    },
  },
});

// Generate OpenAPI document
// Register security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token from Better Auth',
});

const generator = new OpenApiGeneratorV3(registry.definitions);

const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'PeepoPay API',
    description: 'Production-grade booking and payment infrastructure for service businesses',
    contact: {
      name: 'API Support',
      email: 'support@peepopay.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
    {
      url: 'https://api.peepopay.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User profile and account management',
    },
    {
      name: 'Services',
      description: 'Service management endpoints',
    },
    {
      name: 'Bookings',
      description: 'Booking management endpoints',
    },
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
  ],
});

// Write to file
const outputPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log('✅ OpenAPI specification generated successfully');
console.log(`📄 File: ${outputPath}`);
console.log(`📊 Endpoints: ${Object.keys(openApiDocument.paths || {}).length}`);
console.log(`📦 Schemas: ${Object.keys(openApiDocument.components?.schemas || {}).length}`);
