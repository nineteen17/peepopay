# PeepoPay

**Production-grade booking and payment platform for tradies**

PeepoPay enables tradies to accept booking deposits through an embeddable widget while maintaining full control of their Stripe accounts.

## ✨ Features

- 🎯 **Embeddable Booking Widget** - React 19/Vite widget for seamless customer bookings
- 💰 **Stripe Connect Integration** - Direct-to-tradie payments with automatic platform fees
- 📊 **Tradie Dashboard** - Next.js 16 dashboard for managing services and bookings
- 🔐 **Better Auth** - Secure authentication with Google OAuth + Email/Password
- ⚡ **Real-time Availability** - Manage availability and blocked time slots
- 📧 **Automated Notifications** - Email confirmations via RabbitMQ worker service
- 🚀 **Message Queue** - RabbitMQ for reliable async job processing with retries
- 💾 **Redis Caching** - Fast service listings and session management
- 🏥 **Health Monitoring** - Comprehensive health checks for all infrastructure services
- 🔒 **Type Safety** - Auto-synced TypeScript types from Zod schemas across all packages
- 📖 **API Documentation** - Interactive Swagger UI generated from OpenAPI spec
- 🐳 **Docker Ready** - Complete containerization with Docker Swarm support
- 🔒 **Production Ready** - Traefik reverse proxy with SSL/TLS support

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Customer (Browser)              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Traefik (Reverse Proxy + SSL)        │
└─────┬──────────────────┬────────────────┘
      │                  │
      ▼                  ▼
┌──────────┐      ┌──────────────┐
│  Widget  │      │  Dashboard   │
│ (Static) │      │  (Next.js)   │
└────┬─────┘      └──────┬───────┘
     │                   │
     └───────┬───────────┘
             ▼
      ┌──────────────┐        ┌──────────────┐
      │  API Server  │◄───────│    Worker    │
      │  (Express)   │        │   Service    │
      └──────┬───────┘        └──────┬───────┘
             │                       │
       ┌─────┴───────┬───────────────┘
       │             │
       ▼             ▼
┌────────────┐  ┌──────────┐
│ PostgreSQL │  │ RabbitMQ │
│  Database  │  │  Queue   │
└────────────┘  └──────────┘
       │             │
       ▼             ▼
   ┌────────────────────┐
   │    Redis Cache     │
   └────────────────────┘
```

## 📦 Project Structure

```
peepopay/
├── packages/
│   ├── api/           # Node.js/Express API server
│   ├── dashboard/     # Next.js dashboard application
│   └── widget/        # React/Vite booking widget
├── docker/            # Docker and Traefik configuration
├── Docs/              # Comprehensive documentation
├── scripts/           # Development and deployment scripts
└── docker-compose.yml # Docker orchestration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker** & Docker Compose
- **PostgreSQL** 16+ (via Docker or Supabase)
- **Stripe Account** (for payments)
- **Google OAuth** credentials (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/peepopay.git
   cd peepopay
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure environment variables**

   Update `.env` files with your actual credentials:

   ```bash
   # Root .env
   cp .env.example .env

   # API .env
   cp packages/api/.env.example packages/api/.env

   # Dashboard .env
   cp packages/dashboard/.env.example packages/dashboard/.env

   # Widget .env
   cp packages/widget/.env.example packages/widget/.env
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

5. **Access the applications**
   - Dashboard: http://localhost:3000
   - API: http://localhost:4000
   - Widget: http://localhost:5173

## 🛠️ Development

### Available Scripts

```bash
# Start all services in development mode
npm run dev

# Start individual services
npm run dev:api        # API server on port 4000
npm run dev:worker     # Worker service (from packages/api)
npm run dev:dashboard  # Dashboard on port 3000
npm run dev:widget     # Widget on port 5173

# Build all packages
npm run build

# Run tests
npm run test

# Docker commands
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
npm run docker:logs    # View Docker logs

# Database commands (from packages/api)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
npm run db:push        # Push schema to database
npm run db:studio      # Open Drizzle Studio

# Type safety commands
npm run sync-types     # Sync API types to frontends
npm run validate-types # Validate types are in sync
npm run generate:openapi # Generate OpenAPI spec
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 | Dashboard application |
| **Widget** | React 19 + Vite | Embeddable booking widget |
| **Backend** | Node.js + Express | REST API server |
| **Worker** | Node.js | Async job processing |
| **Database** | PostgreSQL 16 | Primary data store |
| **ORM** | Drizzle ORM | Type-safe database access |
| **Auth** | Better Auth | Authentication & sessions |
| **Payments** | Stripe Connect | Payment processing |
| **Queue** | RabbitMQ | Message queue with retries |
| **Cache** | Redis | Service listings & sessions |
| **Proxy** | Traefik | Reverse proxy & SSL |
| **Container** | Docker | Containerization |
| **Orchestration** | Docker Swarm | Production deployment |

## 📚 Documentation

Comprehensive documentation is available in the [`Docs/`](./Docs) directory:

- [Tech Stack](./Docs/architecture/01-tech-stack.md) - Technology decisions and rationale
- [System Design](./Docs/architecture/02-system-design.md) - Architecture overview
- [Database Schema](./Docs/architecture/03-database-schema.md) - Drizzle ORM models

### Key Concepts

#### Widget Architecture
⚠️ **Important:** The widget is a static build, NOT a running container
- Built with Vite → static HTML/JS/CSS
- Served by Traefik or CDN
- No server-side code in widget
- All business logic in API

#### Payment Flow
💰 **Money flows directly to tradie Stripe accounts**
- Platform takes 2.5% fee automatically
- No escrow or holding accounts
- Tradie maintains full control
- Instant payouts to tradie

#### Middleware Split
🔀 **Two layers of middleware**
- **Traefik**: Infrastructure (rate limiting, SSL, routing)
- **Node.js**: Application (auth, validation, business logic)

#### Worker Service & Message Queue
🛠️ **Async job processing with RabbitMQ**
- **Worker Service**: Separate Node.js process consuming from queues
- **Email Notifications**: Booking confirmations sent via queue
- **Stripe Webhooks**: Processed asynchronously for reliability
- **Retry Logic**: Failed jobs retry 3 times with exponential backoff
- **Dead Letter Queue**: Failed jobs stored for manual review
- **Queue Types**:
  - `email_notifications` - General email sending
  - `booking_confirmations` - Booking confirmation emails
  - `stripe_webhooks` - Stripe event processing
  - `failed_jobs` - Dead letter queue for failures

#### Health Monitoring
🏥 **Comprehensive health checks**
- `/health` endpoint returns 200 (healthy) or 503 (unhealthy)
- Monitors: Database connectivity, Redis connection, RabbitMQ status
- Response includes individual service status with response times
- Used by Docker health checks and load balancers

#### Redis Caching
💾 **Smart caching for performance**
- **Service Listings**: 10-minute TTL for public service data
- **Session Storage**: User sessions and authentication tokens
- **Cache Invalidation**: Automatic on service create/update/delete

#### Type Safety & API Documentation
🔒 **End-to-end type safety with automatic synchronization**
- **Zod Schemas**: Single source of truth in API database schemas
- **OpenAPI Generation**: Auto-generated from Zod schemas
- **Automatic Type Sync**: Types propagate to Dashboard and Widget on API build/dev
- **Compile-Time Validation**: TypeScript catches API mismatches before runtime
- **Swagger UI**: Interactive API docs at `/api-docs`
- **No Manual Steps**: Everything happens automatically

**How It Works:**
```bash
# 1. Update API schema
vim packages/api/src/db/schema/services.ts

# 2. Start API (types sync automatically!)
cd packages/api
npm run dev    # or npm run build

# 3. Pull updated types in Dashboard/Widget
cd packages/dashboard
git pull  # Get the auto-synced types

# 4. TypeScript enforces correct usage
# IDE shows new fields with autocomplete immediately
```

**Benefits:**
- ✅ No field name mismatches (like `price` vs `depositAmount`)
- ✅ IDE autocomplete for all API responses
- ✅ Prevents 400 Bad Request errors at compile time
- ✅ Independent deployments (no monorepo dependencies)
- ✅ Always up-to-date documentation
- ✅ Zero manual sync steps

See [TYPE_SAFETY_SETUP.md](./TYPE_SAFETY_SETUP.md) for complete guide.

## 🐳 Docker Deployment

PeepoPay includes three Docker configurations for different environments:

### Local Development (`docker-compose.dev.yml`)

Hot-reload development environment with all infrastructure services:

```bash
# Start all services (PostgreSQL, Redis, RabbitMQ, API, Worker, Dashboard, Widget)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access services
# - API: http://localhost:4000
# - Dashboard: http://localhost:3000
# - Widget: http://localhost:5173
# - RabbitMQ Management: http://localhost:15672 (admin/admin)
# - Drizzle Studio: http://localhost:4983
```

**Features:**
- Volume mounts for hot-reload
- All 7 services running
- RabbitMQ management UI
- Health checks for all services

### Production Testing (`docker-compose.yml`)

Production-like environment for local testing with Traefik:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Features:**
- Production builds for all services
- Traefik reverse proxy with routing
- SSL/TLS termination
- Health monitoring

### Docker Swarm (`docker-stack.yml`)

Production deployment with high availability:

```bash
# Initialize swarm (one-time)
docker swarm init

# Create secrets
echo "your-db-password" | docker secret create postgres_password -
echo "your-stripe-key" | docker secret create stripe_secret_key -

# Deploy stack
docker stack deploy -c docker-stack.yml peepopay

# Monitor services
docker stack services peepopay
docker service logs -f peepopay_api
```

**Features:**
- API: 2 replicas with rolling updates
- Worker: 1 replica with restart policy
- Dashboard: 2 replicas
- Widget: Served via nginx with caching
- Overlay networking
- Docker secrets for sensitive data
- Resource limits and placement constraints
- Traefik with Let's Encrypt SSL

### Traefik Dashboard

Access Traefik dashboard at http://localhost:8080

## 🔐 Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/peepopay

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_...

# Better Auth
BETTER_AUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

See `.env.example` files for complete configuration options.

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=@peepopay/api
```

## 📈 Monitoring & Logging

- **API Logs**: `docker-compose logs -f api`
- **Worker Logs**: `docker-compose logs -f worker`
- **Database Logs**: `docker-compose logs -f postgres`
- **RabbitMQ Management**: http://localhost:15672 (admin/admin)
- **Traefik Dashboard**: http://localhost:8080
- **Drizzle Studio**: `npm run db:studio` (from packages/api)
- **Health Check**: `curl http://localhost:4000/health`

## 🚢 Production Deployment

### Docker Swarm (Recommended)

1. **Initialize Swarm**
   ```bash
   docker swarm init
   ```

2. **Create Docker Secrets**
   ```bash
   echo "your-postgres-password" | docker secret create postgres_password -
   echo "your-stripe-secret" | docker secret create stripe_secret_key -
   echo "your-better-auth-secret" | docker secret create better_auth_secret -
   ```

3. **Deploy Stack**
   ```bash
   docker stack deploy -c docker-stack.yml peepopay
   ```

4. **Monitor Deployment**
   ```bash
   # View all services
   docker stack services peepopay

   # View logs
   docker service logs -f peepopay_api
   docker service logs -f peepopay_worker
   ```

5. **Configure DNS**
   - Point your domain to your server
   - Traefik will automatically provision SSL certificates via Let's Encrypt

### DigitalOcean / VPS

1. Set up a droplet/VPS with Docker
2. Clone repository
3. Configure environment variables
4. Run `docker-compose up -d --build`

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: [Docs/](./Docs)
- **Issues**: GitHub Issues
- **Email**: support@peepopay.com

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Stripe](https://stripe.com/)
- [Better Auth](https://better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Traefik](https://traefik.io/)

---

**Made with ❤️ for tradies who deserve better payment solutions**