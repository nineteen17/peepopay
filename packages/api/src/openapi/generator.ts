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
import {
  insertBookingSchema,
  selectBookingSchema,
  insertServiceSchema,
  selectServiceSchema,
  insertUserSchema,
  selectUserSchema,
} from '../db/schema/index.js';

const registry = new OpenAPIRegistry();

// Register component schemas
registry.register('Booking', selectBookingSchema);
registry.register('NewBooking', insertBookingSchema);
registry.register('Service', selectServiceSchema);
registry.register('NewService', insertServiceSchema);
registry.register('User', selectUserSchema);

// Error response schema
const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

registry.register('Error', errorResponseSchema);

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
            services: z.array(selectServiceSchema),
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
            services: z.array(selectServiceSchema),
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
            service: selectServiceSchema,
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
          schema: insertServiceSchema.omit({ userId: true }),
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
            service: selectServiceSchema,
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
          schema: insertServiceSchema.partial().omit({ userId: true }),
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
            service: selectServiceSchema,
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
            bookings: z.array(selectBookingSchema),
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
            booking: selectBookingSchema,
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
          schema: insertBookingSchema.omit({ userId: true }),
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
            booking: selectBookingSchema,
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
            booking: selectBookingSchema,
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
            booking: selectBookingSchema,
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
const generator = new OpenApiGeneratorV3(registry.definitions);

const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'PeepoPay API',
    description: 'Production-grade booking and payment platform for tradies',
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
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from Better Auth',
      },
    },
  },
});

// Write to file
const outputPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log('✅ OpenAPI specification generated successfully');
console.log(`📄 File: ${outputPath}`);
console.log(`📊 Endpoints: ${Object.keys(openApiDocument.paths || {}).length}`);
console.log(`📦 Schemas: ${Object.keys(openApiDocument.components?.schemas || {}).length}`);
