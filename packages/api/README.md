# @peepopay/api

**Production-grade REST API for PeepoPay booking platform**

Express.js backend with PostgreSQL, Redis, RabbitMQ, and Stripe Connect integration.

## 🚀 Features

- 🔐 **Better Auth** - Authentication with Google OAuth + Email/Password
- 💳 **Stripe Connect** - Direct payments to tradie accounts with platform fees
- 📊 **Drizzle ORM** - Type-safe database access with PostgreSQL
- 🚀 **RabbitMQ** - Message queue for async job processing
- 💾 **Redis** - Caching for service listings and sessions
- 🏥 **Health Checks** - Comprehensive monitoring of all services
- 🛠️ **Worker Service** - Separate process for email and webhook processing
- 🐳 **Docker Ready** - Multi-stage builds with health checks
- 🔒 **Type Safety** - Zod schemas with auto-generated OpenAPI specs
- 📖 **API Documentation** - Interactive Swagger UI for testing and exploration

## 📦 Architecture

```
┌─────────────────────────────────────┐
│          API Server (Express)       │
│                                     │
│  ┌──────────────────────────────┐  │
│  │     Controllers              │  │
│  │  (HTTP Request Handling)     │  │
│  └────────────┬─────────────────┘  │
│               │                     │
│  ┌────────────▼─────────────────┐  │
│  │      Services                │  │
│  │  (Business Logic)            │  │
│  └────────────┬─────────────────┘  │
│               │                     │
└───────────────┼─────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐  ┌───────┐  ┌─────────┐
│Postgres│  │ Redis │  │RabbitMQ │
└────────┘  └───────┘  └─────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Worker    │
                    │   Service   │
                    └─────────────┘
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 20 |
| **Framework** | Express.js 4 |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL 16 |
| **ORM** | Drizzle ORM |
| **Cache** | Redis 7 |
| **Queue** | RabbitMQ 3 |
| **Auth** | Better Auth |
| **Payments** | Stripe Connect |
| **Email** | Nodemailer |

## 📁 Project Structure

```
packages/api/
├── src/
│   ├── db/
│   │   ├── schema/          # Drizzle ORM schemas (Zod-based)
│   │   │   ├── users.ts
│   │   │   ├── services.ts
│   │   │   ├── bookings.ts
│   │   │   └── availability.ts
│   │   ├── index.ts         # Database connection
│   │   └── migrate.ts       # Migration runner
│   │
│   ├── openapi/
│   │   └── generator.ts     # OpenAPI spec generator from Zod schemas
│   │
│   ├── modules/
│   │   ├── auth/            # Authentication
│   │   ├── services/        # Service management
│   │   ├── bookings/        # Booking operations
│   │   ├── webhooks/        # Stripe webhooks
│   │   └── stripe/          # Stripe Connect
│   │
│   ├── lib/
│   │   ├── redis.ts         # Redis client & caching
│   │   ├── queue.ts         # RabbitMQ connection
│   │   ├── health.ts        # Health check system
│   │   └── stripe.ts        # Stripe helpers
│   │
│   ├── middleware/
│   │   ├── auth.ts          # Auth middleware
│   │   ├── errorHandler.ts # Global error handler
│   │   └── validation.ts   # Request validation
│   │
│   ├── config/
│   │   └── index.ts         # Configuration management
│   │
│   ├── index.ts             # API server entry point
│   └── worker.ts            # Worker service entry point
│
├── openapi.json             # Auto-generated OpenAPI 3.0 spec
├── Dockerfile               # Production build
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 3+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
```

### Development

```bash
# Run database migrations
npm run db:migrate

# Start API server (port 4000)
npm run dev

# Start worker service (separate terminal)
npm run dev:worker

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Building

```bash
# Generate OpenAPI spec (automatically runs before build)
npm run generate:openapi

# Compile TypeScript
npm run build

# Start production server
npm start

# Start production worker
npm run start:worker
```

## 🔒 Type Safety & API Documentation

### Zod Schemas

All database schemas use **Zod** for validation and type inference:

```typescript
// packages/api/src/db/schema/services.ts
import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  depositAmount: integer('deposit_amount').notNull(),
  duration: integer('duration').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  // ... more fields
});

// Auto-generated Zod schemas
export const insertServiceSchema = createInsertSchema(services);
export const selectServiceSchema = createSelectSchema(services);
```

### OpenAPI Generation

OpenAPI 3.0 specs are **automatically generated** from Zod schemas:

```bash
# Generate OpenAPI spec
npm run generate:openapi

# Output: packages/api/openapi.json
```

The generator creates comprehensive API documentation including:
- All endpoints with request/response schemas
- Authentication requirements
- Status codes and error responses
- Type-safe schemas from Zod

### Swagger UI

**Interactive API documentation** is available at `/api-docs`:

```bash
# Start API server
npm run dev

# Open browser
http://localhost:4000/api-docs
```

**Features:**
- Test API endpoints directly from browser
- View request/response schemas
- Authenticate with Bearer tokens
- Always up-to-date with code

### Type Sync to Frontends

Types are automatically synced to Dashboard and Widget:

```bash
# From root directory
npm run sync-types

# This will:
# 1. Generate OpenAPI spec from Zod schemas
# 2. Generate TypeScript types
# 3. Copy to Dashboard and Widget
# 4. Validate consistency
```

See [TYPE_SAFETY_SETUP.md](../../TYPE_SAFETY_SETUP.md) for details.

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/register        # Register new user
POST   /api/auth/login           # Login
GET    /api/auth/session         # Get current session
POST   /api/auth/logout          # Logout
```

### Services

```
GET    /api/services             # Get user's services (authenticated)
GET    /api/services/user/:slug  # Get public services by user slug
GET    /api/services/:id         # Get single service
POST   /api/services             # Create service (authenticated)
PUT    /api/services/:id         # Update service (authenticated)
DELETE /api/services/:id         # Delete service (authenticated)
```

### Bookings

```
GET    /api/bookings             # Get user's bookings (authenticated)
GET    /api/bookings/:id         # Get single booking (authenticated)
POST   /api/bookings             # Create booking (public from widget)
PUT    /api/bookings/:id/status  # Update booking status (authenticated)
DELETE /api/bookings/:id         # Cancel booking (authenticated)
```

### Stripe

```
POST   /api/stripe/connect       # Create Stripe Connect account
GET    /api/stripe/account       # Get account status
POST   /api/stripe/onboard       # Get onboarding link
```

### Webhooks

```
POST   /api/webhooks/stripe      # Stripe webhook handler
```

### Health

```
GET    /health                   # Health check (200=healthy, 503=unhealthy)
```

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
PORT=4000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/peepopay

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:4000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## 🛠️ Worker Service

The worker service processes async jobs from RabbitMQ queues:

### Queues

| Queue | Purpose | Prefetch |
|-------|---------|----------|
| `email_notifications` | General email sending | 5 |
| `booking_confirmations` | Booking confirmation emails | 3 |
| `stripe_webhooks` | Stripe event processing | 10 |
| `failed_jobs` | Dead letter queue | 1 |

### Retry Logic

- Failed jobs retry up to 3 times
- Exponential backoff between retries
- After 3 failures, moved to `failed_jobs` queue

### Running the Worker

```bash
# Development
npm run dev:worker

# Production
npm run start:worker
```

## 🏥 Health Monitoring

The `/health` endpoint provides comprehensive service monitoring:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T12:00:00.000Z",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 12
    },
    "redis": {
      "status": "up",
      "responseTime": 3
    },
    "rabbitmq": {
      "status": "up",
      "responseTime": 8
    }
  }
}
```

**Status Codes:**
- `200` - All services healthy
- `503` - One or more services down

## 💾 Redis Caching

### Cache Strategy

| Data | TTL | Key Pattern |
|------|-----|-------------|
| Service listings | 10 min | `services:user:{slug}` |
| User sessions | Session | `session:{sessionId}` |

### Cache Invalidation

Caches automatically invalidate on:
- Service create/update/delete
- User updates

## 📊 Database Management

```bash
# Generate migration from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

## 🐳 Docker

### Development

```bash
# Start with Docker Compose
docker-compose -f ../../docker-compose.dev.yml up api worker
```

### Production

```bash
# Build image
docker build -t peepopay-api .

# Run API
docker run -p 4000:4000 --env-file .env peepopay-api npm start

# Run Worker
docker run --env-file .env peepopay-api npm run start:worker
```

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## 📈 Monitoring

### Logs

```bash
# View API logs
docker-compose logs -f api

# View worker logs
docker-compose logs -f worker
```

### RabbitMQ Management UI

Access at http://localhost:15672 (admin/admin)

### Health Check

```bash
curl http://localhost:4000/health
```

## 🔒 Security

- **Helmet.js** - Security headers
- **CORS** - Configured for widget and dashboard
- **Better Auth** - Secure session management
- **Stripe Signature Verification** - Webhook validation
- **Input Validation** - Zod schemas for all inputs
- **SQL Injection Protection** - Drizzle ORM parameterized queries

## 📝 Development Guidelines

### Controller/Service Pattern

- **Controllers** - Handle HTTP requests, validation, responses
- **Services** - Business logic, database operations
- **Keep controllers thin** - Delegate to services

### Error Handling

```typescript
import { AppError } from '../middleware/errorHandler.js';

// Throw custom errors
throw new AppError(404, 'Service not found');

// Global error handler catches and formats
```

### Adding New Endpoints

1. Create schema in `db/schema/`
2. Create service in `modules/{module}/{module}.service.ts`
3. Create controller in `modules/{module}/{module}.controller.ts`
4. Register routes in `index.ts`

## 📚 Additional Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Better Auth Docs](https://better-auth.com/)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)

## 🤝 Contributing

See main project [CONTRIBUTING.md](../../CONTRIBUTING.md)

## 📄 License

MIT
