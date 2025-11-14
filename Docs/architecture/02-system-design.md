# System Design

## High-Level Architecture

PeepoPay uses a microservices architecture deployed on Docker Swarm with Traefik as the reverse proxy.

```
┌─────────────────────────────────────────────────────┐
│                  DigitalOcean Droplet                │
│                    (Docker Swarm)                    │
│                                                      │
│  ┌──────────────┐         ┌──────────────┐         │
│  │   Traefik    │         │   Next.js    │         │
│  │ (SSL/Proxy)  │         │  (Dashboard) │         │
│  │   :80/443    │         │    :3000     │         │
│  │              │         └──────────────┘         │
│  │ Static:      │                                   │
│  │ /widget/dist │                                   │
│  └──────┬───────┘                                   │
│         │                                           │
│  ┌──────▼───────────────────────────────────────┐ │
│  │         Node.js API Server (:4000)            │ │
│  └──────┬───────────────────────────────────────┘ │
│         │                                           │
│  ┌──────▼──────┐  ┌──────────┐  ┌──────────────┐ │
│  │   Redis     │  │ RabbitMQ │  │ Worker Pool  │ │
│  │   :6379     │  │  :5672   │  │ (Node.js)    │ │
│  └─────────────┘  └──────────┘  └──────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   Supabase DB    │
              │   (PostgreSQL)   │
              └──────────────────┘

Alternative (Scaled):
┌──────────────────┐
│  CDN (Cloudflare)│ ← Widget static files
│  /widget/*       │
└──────────────────┘
```

## Traffic Flow

```
Customer → Traefik → Widget (iframe)
                      ↓
                    API Server → Redis (cache/session)
                      ↓
                    PostgreSQL (Supabase)
                      ↓
                    RabbitMQ → Workers (emails, webhooks)
```

## Service Definitions

| Service | Purpose | Port | Replicas | Technology |
|---------|---------|------|----------|------------|
| Traefik | Reverse proxy, SSL, routing | 80, 443 | 1 | Traefik v2.10 |
| API | REST API, business logic | 4000 | 2-3 | Node.js/Express |
| Dashboard | Business dashboard | 3000 | 1-2 | Next.js 14 |
| Widget Server | Static file server for widget | 8080 | 1 | Nginx Alpine |
| Redis | Cache, sessions, rate limiting | 6379 | 1 | Redis 7 Alpine |
| RabbitMQ | Message queue | 5672, 15672 | 1 | RabbitMQ 3 |
| Worker | Async job processor | - | 2-3 | Node.js |

## Network Architecture

```
┌─────────────────────────────────────────┐
│         Docker Swarm Network            │
│                                          │
│  ┌────────┐    ┌────────┐    ┌───────┐│
│  │Traefik │───▶│  API   │───▶│ Redis ││
│  └────────┘    └────┬───┘    └───────┘│
│      │              │                  │
│      │              ▼                  │
│      │         ┌──────────┐           │
│      │         │ RabbitMQ │           │
│      │         └────┬─────┘           │
│      │              │                  │
│      │              ▼                  │
│      │         ┌──────────┐           │
│      │         │  Worker  │           │
│      │         └──────────┘           │
│      │                                 │
│      ▼                                 │
│  ┌──────────┐    ┌─────────┐         │
│  │Dashboard │    │ Widget  │         │
│  └──────────┘    └─────────┘         │
└─────────────────────────────────────────┘
```

## Widget Architecture

### Critical: Widget is Static, Not a Container

The widget is **NOT a running service** - it's a static Single Page Application (SPA):

```
Development:
  npm run dev (Vite) → localhost:5173

Production Build:
  npm run build → dist/
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   ├── index-[hash].css
    └── embed.js (optional)

Deployment:
  dist/ → Nginx container OR CDN
```

### Why Static Build?

✅ **Performance**: Sub-1s load time with CDN  
✅ **Scalability**: Infinite horizontal scale (CDN handles traffic)  
✅ **Reliability**: No server-side failures  
✅ **Cost**: ~$0-5/month for CDN vs $12-24/month per container  
✅ **Security**: No server-side attack surface for widget  
✅ **Caching**: Browser + CDN caching (99% cache hit rate)

### Widget Communication Pattern

```
Customer visits: example.com
                     ↓
<iframe src="peepopay.com/book/joe-plumber">
                     ↓
1. Load static HTML/JS/CSS (from CDN/Traefik)
2. JS executes in browser
3. Fetch provider data: GET /api/providers/joe-plumber
4. User fills form
5. Create booking: POST /api/bookings
6. Stripe payment: POST /api/payments/intent
7. Confirm via Stripe Elements
8. Update booking: PATCH /api/bookings/:id
```

**Key Principle**: All business logic lives in the API server. Widget is pure presentation.

## Scaling Strategy

### Phase 1: Single Droplet (MVP)
- **Capacity**: 100 concurrent bookings
- **Cost**: $24/month (4GB droplet)
- **Monitoring**: Resource usage via DO dashboard

```
Single DigitalOcean Droplet
├── Traefik (1 instance)
├── API (2 replicas)
├── Dashboard (1 replica)
├── Redis (1 instance)
├── RabbitMQ (1 instance)
└── Worker (2 replicas)
```

### Phase 2: Horizontal Scaling

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Droplet 1     │  │   Droplet 2     │  │   Droplet 3     │
│  (API + Worker) │  │  (API + Worker) │  │  (API + Worker) │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Load Balancer    │
                    │    (DO Managed)    │
                    └────────────────────┘
```

### Phase 3: Dedicated Services

```
Load Balancer
     ├─→ API Nodes (3x droplets)
     ├─→ Dashboard Nodes (2x droplets)
     ├─→ Widget CDN (DO Spaces)
     ├─→ Redis Cluster (DO Managed)
     └─→ RabbitMQ Cluster (3 nodes)
```

## Data Flow Patterns

### Booking Creation Flow

```
1. Customer fills widget form
   ↓
2. Widget → API: POST /api/bookings
   ↓
3. API validates availability (Redis cache)
   ↓
4. API creates Stripe PaymentIntent
   ↓
5. API creates Booking (status: pending)
   ↓
6. API returns client_secret to widget
   ↓
7. Widget displays Stripe Elements
   ↓
8. Customer enters card details (direct to Stripe)
   ↓
9. Stripe processes payment
   ↓
10. Stripe webhook → API: payment_intent.succeeded
    ↓
11. API updates Booking (status: confirmed)
    ↓
12. API queues notification jobs (RabbitMQ)
    ↓
13. Workers send emails/SMS
```

### Availability Check Flow

```
1. Widget → API: GET /api/availability/:slug?date=2025-01-15
   ↓
2. API checks Redis cache
   ↓
3. Cache HIT? → Return cached slots
   ↓
4. Cache MISS? → Calculate from database:
   - Get availability rules
   - Get existing bookings
   - Get blocked dates
   - Calculate available slots
   ↓
5. Cache result (TTL: 5 minutes)
   ↓
6. Return available slots
```

### Webhook Processing Flow

```
1. Stripe → API: POST /webhooks/stripe
   ↓
2. API verifies signature
   ↓
3. API validates event type
   ↓
4. API publishes to RabbitMQ queue
   ↓
5. Worker consumes event
   ↓
6. Worker updates database
   ↓
7. Worker queues notifications
   ↓
8. Email/SMS workers send messages
```

## Middleware Architecture

### Two-Layer Middleware Strategy

**Layer 1: Infrastructure (Traefik)**
- Rate limiting (per-IP)
- CORS headers
- SSL termination
- Request compression
- Security headers

**Layer 2: Application (Node.js)**
- Authentication (Better Auth)
- Authorization (resource ownership)
- Input validation (Zod schemas)
- Business logic
- Error handling

### Why Two Layers?

✅ **Separation of concerns**: Infrastructure vs application logic  
✅ **Performance**: Traefik handles high-volume operations  
✅ **Flexibility**: Can swap API without changing infrastructure  
✅ **Security**: Defense in depth

## Caching Strategy

| Data Type | Cache Layer | TTL | Invalidation |
|-----------|-------------|-----|--------------|
| Available slots | Redis | 5 min | On booking creation/cancellation |
| Service listings | Redis | 10 min | On service update |
| Provider profile | Redis | 10 min | On profile update |
| Session data | Redis | 7 days | On logout |
| Static assets | CDN | 1 year | Version hash in filename |

## Security Architecture

### Authentication Flow
1. User enters credentials
2. Better Auth validates
3. Session created in database
4. httpOnly cookie set
5. Subsequent requests include cookie
6. API validates session with Better Auth

### Authorization Pattern
```javascript
// Every protected endpoint
async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({ 
    headers: req.headers 
  })
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  
  req.user = session.user
  next()
}

// Resource ownership check
async function requireOwnership(req, res, next) {
  const booking = await db.booking.findUnique({
    where: { id: req.params.id }
  })
  
  if (booking.userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" })
  }
  
  next()
}
```

## API Architecture Pattern

### Controller/Service Architecture

PeepoPay API follows a clean **controller/service architecture** for maintainability and separation of concerns.

#### Directory Structure

```
packages/api/src/
├── config/           # Configuration files
├── db/              # Database schemas and migrations
├── modules/         # Feature modules (controller + service)
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── users.controller.ts
│   │   └── users.service.ts
│   ├── services/
│   │   ├── services.controller.ts
│   │   └── services.service.ts
│   ├── bookings/
│   │   ├── bookings.controller.ts
│   │   └── bookings.service.ts
│   └── webhooks/
│       ├── webhooks.controller.ts
│       └── webhooks.service.ts
├── middleware/      # Shared middleware
├── lib/            # Shared utilities (Stripe, auth helpers)
└── index.ts        # Express app setup
```

#### Layer Responsibilities

**Controllers** (`*.controller.ts`):
- Handle HTTP request/response cycle
- Define routes and middleware
- Validate request data
- Call service methods
- Format responses
- Handle HTTP-specific logic

**Services** (`*.service.ts`):
- Contain business logic
- Execute database queries
- Interact with external APIs
- Process data transformations
- Return data or throw errors
- Re-usable across controllers

#### Example Implementation

**users.controller.ts**
```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { UsersService } from './users.service';

const router = Router();
const usersService = new UsersService();

// GET /api/users/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.user!.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/me
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.user!.id, req.body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**users.service.ts**
```typescript
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler';

export class UsersService {
  async getUserById(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, data: Partial<User>) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    const { passwordHash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }
}
```

#### Benefits of This Pattern

✅ **Separation of Concerns**: HTTP logic separate from business logic
✅ **Testability**: Services can be tested without HTTP mocking
✅ **Reusability**: Services can be called from multiple controllers
✅ **Maintainability**: Clear structure, easy to find code
✅ **Scalability**: Easy to add new features following same pattern
✅ **Type Safety**: Full TypeScript support throughout

#### Module Organization

Each module is **self-contained**:
- Groups related functionality
- Clear boundaries between features
- Easy to understand and modify
- Can be extracted to microservices later

Example modules:
- **auth**: Authentication, login, signup, session management
- **users**: User profile, settings, Stripe onboarding
- **services**: Service CRUD operations (provider's offerings)
- **bookings**: Booking creation, management, cancellation
- **webhooks**: Stripe webhook handlers

## Error Handling

### Error Flow
```
Error occurs
  ↓
Custom error class thrown
  ↓
Global error handler catches
  ↓
Log to Sentry (if 5xx)
  ↓
Return standardized response
```

### Error Response Format
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Booking time slot is no longer available",
  "code": "SLOT_UNAVAILABLE",
  "statusCode": 400
}
```

## Monitoring & Observability

### Health Checks
- **/health**: Overall system health
- **/health/db**: Database connectivity
- **/health/redis**: Redis connectivity
- **/health/rabbitmq**: RabbitMQ connectivity

### Metrics Collected
- API response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database query performance
- Cache hit rates
- Queue depths
- Payment success rates

### Alerting Triggers
- Error rate > 5% for 5 minutes
- API latency p95 > 2 seconds
- Payment failures > 10%
- Database connection errors
- Memory usage > 85%

## Next Steps

- [Database Schema →](./03-database-schema.md)
- [Payment Flows →](./04-payment-flows.md)
- [Traefik Configuration →](../infrastructure/traefik.md)
