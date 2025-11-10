# Tech Stack

## Overview

PeepoPay uses a production-grade stack optimized for scalability, maintainability, and cost-effectiveness.

## Frontend Technologies

### Next.js (Dashboard)
**Version**: 14+ (App Router)

**Why Next.js?**
- ✅ SSR/SSG for marketing pages + dashboard
- ✅ File-based routing
- ✅ Built-in optimization (images, fonts, code splitting)
- ✅ API routes for server-side logic
- ✅ Excellent developer experience
- ✅ Production-ready out of the box

**Use Cases**:
- Marketing website
- Tradie dashboard
- Admin interface
- Public pages

### React + Vite (Widget)
**Why Vite instead of Next.js?**
- ✅ Smaller bundle size (~50KB vs ~200KB)
- ✅ Faster build times
- ✅ Simpler deployment (static files only)
- ✅ Better for embeddable widgets
- ✅ No SSR overhead for iframe content

**Use Cases**:
- Embeddable booking widget
- Standalone SPA in iframe

### Tailwind CSS
**Why Tailwind?**
- ✅ Utility-first approach
- ✅ Consistent design system
- ✅ Minimal custom CSS
- ✅ Built-in responsive design
- ✅ Tree-shaking reduces bundle size
- ✅ Works seamlessly with both Next.js and Vite

## Backend Technologies

### Node.js + Express
**Why Node.js?**
- ✅ JavaScript everywhere (same language as frontend)
- ✅ Excellent async handling (perfect for I/O-heavy operations)
- ✅ Massive ecosystem (npm packages)
- ✅ Great Stripe SDK support
- ✅ Team familiarity

**Why Express over alternatives?**
- ✅ Mature and battle-tested
- ✅ Minimal and unopinionated
- ✅ Excellent middleware ecosystem
- ✅ Easy to reason about
- ❌ Not: Fastify (overkill), NestJS (too opinionated), Koa (less adoption)

### PostgreSQL
**Why PostgreSQL?**
- ✅ ACID compliance (critical for payments)
- ✅ JSON support (flexible schemas)
- ✅ Excellent performance
- ✅ Rich ecosystem
- ✅ Advanced features (full-text search, geospatial)

**Hosting**: Supabase
- ✅ Managed PostgreSQL
- ✅ Automatic backups
- ✅ Connection pooling
- ✅ Free tier for development
- ✅ Easy scaling
- ❌ Using ONLY the database (not Supabase Auth/Storage/etc)

### Drizzle ORM
**Why Drizzle over Prisma?**
- ✅ Zero runtime overhead
- ✅ Type-safe SQL queries
- ✅ Migration system built-in
- ✅ Better performance (no query engine)
- ✅ Lighter weight
- ✅ Full SQL access when needed

### Redis
**Why Redis?**
- ✅ Session storage (fast lookups)
- ✅ Rate limiting (atomic counters)
- ✅ Cache layer (reduce DB load)
- ✅ Real-time features (pub/sub)

**Use Cases**:
- Session management
- Rate limiting (per-IP, per-user)
- Availability cache (5-minute TTL)
- Service listings cache

### RabbitMQ
**Why RabbitMQ over alternatives?**
- ✅ Message persistence (won't lose emails/SMS)
- ✅ Retry logic built-in
- ✅ Dead letter queues
- ✅ Better for critical operations vs Redis pub/sub
- ❌ Not: Redis pub/sub (no persistence), SQS (AWS lock-in), Kafka (overkill)

**Use Cases**:
- Email notifications (async)
- SMS notifications
- Webhook processing
- Scheduled jobs

## Authentication

### Better Auth
**Why Better Auth over NextAuth?**
- ✅ Database-first approach
- ✅ Works with any framework (not just Next.js)
- ✅ Built-in session management
- ✅ Email verification out of the box
- ✅ Password reset flows
- ✅ CSRF protection included
- ✅ More flexible than NextAuth
- ✅ Better TypeScript support

**Providers**:
- Google OAuth (primary)
- Email/Password (fallback)

## Payment Processing

### Stripe Connect
**Why Stripe Connect?**
- ✅ Direct-to-tradie payments (no escrow needed)
- ✅ Platform fee automatically deducted
- ✅ Tradie maintains full control
- ✅ Handles compliance/tax
- ✅ Robust webhook system
- ✅ Excellent documentation

**Account Type**: Standard Connect
- ✅ Simplest integration
- ✅ Tradie gets full Stripe dashboard
- ✅ Fastest onboarding
- ❌ Not: Express (more complex), Custom (compliance burden)

## Infrastructure

### Docker Swarm
**Why Swarm over Kubernetes?**
- ✅ Much simpler to manage
- ✅ Single-node or multi-node
- ✅ Built into Docker
- ✅ No separate control plane
- ✅ Perfect for small-to-medium scale
- ❌ Not K8s: Overkill for initial scale, higher ops cost

### Traefik
**Why Traefik?**
- ✅ Automatic service discovery (Docker labels)
- ✅ Automatic SSL (Let's Encrypt)
- ✅ Built-in load balancing
- ✅ Rate limiting
- ✅ Zero-downtime deployments
- ✅ Great for Docker Swarm

### DigitalOcean
**Why DigitalOcean?**
- ✅ Simple and predictable pricing
- ✅ Excellent documentation
- ✅ Great API (Terraform support)
- ✅ Managed databases available
- ✅ Lower cost than AWS/GCP for small scale
- ❌ Not: AWS (complex/expensive), Vercel (not for full-stack), Heroku (expensive)

## External Services

### Supabase
**What we use**: PostgreSQL hosting ONLY
**What we DON'T use**: Supabase Auth, Storage, Functions

### Resend
**Why Resend?**
- ✅ Modern email API
- ✅ Generous free tier (3k emails/month)
- ✅ Simple API
- ✅ React email templates support
- ✅ Better deliverability than SendGrid
- ❌ Not: SendGrid (complex), Mailgun (expensive), AWS SES (setup complexity)

### Twilio (Optional)
**Use**: SMS notifications
**Why**: Industry standard, reliable, good pricing

## Development Tools

### Terraform
**Why Terraform?**
- ✅ Infrastructure as Code
- ✅ Version control for infrastructure
- ✅ Reproducible environments
- ✅ DigitalOcean provider support

### GitHub Actions
**Why GitHub Actions?**
- ✅ Native to GitHub
- ✅ Free for public repos
- ✅ Good free tier for private repos
- ✅ Great Docker integration
- ❌ Not: Jenkins (maintenance burden), CircleCI (cost), GitLab CI (not using GitLab)

## Monitoring & Observability

### Sentry (Error Tracking)
- Frontend errors
- Backend exceptions
- Performance monitoring

### Custom Logging
- Structured JSON logs
- Log aggregation (optional: Loki, Elasticsearch)

### Uptime Monitoring
- Health check endpoints
- External monitoring (UptimeRobot, Better Uptime)

## Decisions Summary

| Category | Choice | Why | Alternatives Rejected |
|----------|--------|-----|----------------------|
| Dashboard | Next.js | SSR, file routing, optimization | Remix, Astro |
| Widget | React + Vite | Small bundle, fast builds | Next.js (too heavy) |
| API | Express | Simple, mature | Fastify, NestJS |
| Database | PostgreSQL | ACID, reliability | MySQL, MongoDB |
| ORM | Drizzle | Performance, type-safety | Prisma |
| Cache | Redis | Speed, features | Memcached |
| Queue | RabbitMQ | Reliability, persistence | Redis pub/sub, SQS |
| Auth | Better Auth | Flexibility, features | NextAuth, Clerk |
| Payments | Stripe Connect | Direct payments, platform fees | PayPal, Square |
| Orchestration | Docker Swarm | Simplicity | Kubernetes |
| Reverse Proxy | Traefik | Auto-discovery, SSL | Nginx, Caddy |
| Hosting | DigitalOcean | Cost, simplicity | AWS, Vercel |
| Emails | Resend | Modern API, free tier | SendGrid, SES |

## Cost Considerations

### Development
- Supabase Free: $0
- DigitalOcean 2GB: $12/month
- **Total: $12/month**

### Production (MVP)
- DigitalOcean 4GB: $24/month
- Supabase Free: $0
- Domain: $12/year
- Resend: $0 (free tier)
- **Total: ~$25/month**

### Production (Scale)
- DigitalOcean 8GB: $48/month
- Supabase Pro: $25/month
- CDN: $0-5/month
- **Total: ~$73/month**

## Next Steps

- [System Design →](./02-system-design.md)
- [Database Schema →](./03-database-schema.md)
