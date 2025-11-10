# PeepoPay Documentation

**Production-grade booking and payment platform for tradies**

## Quick Start

PeepoPay enables tradies to accept booking deposits through an embeddable widget while maintaining full control of their Stripe accounts.

### Core Features
- 🎯 Embeddable booking widget (React/Vite)
- 💰 Stripe Connect integration (direct-to-tradie payments)
- 📊 Tradie dashboard (Next.js)
- 🔐 Better Auth (Google OAuth + Email/Password)
- ⚡ Real-time availability management
- 📧 Automated notifications (email/SMS)

### Tech Stack
- **Frontend**: Next.js (Dashboard) + React/Vite (Widget)
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL (Supabase)
- **Auth**: Better Auth
- **Payments**: Stripe Connect
- **Infrastructure**: Docker Swarm + Traefik
- **Deployment**: DigitalOcean + GitHub Actions

## Documentation Structure

### Architecture
- [Tech Stack](./architecture/01-tech-stack.md) - Technology decisions and rationale
- [System Design](./architecture/02-system-design.md) - High-level architecture overview
- [Database Schema](./architecture/03-database-schema.md) - Drizzle ORM models and relationships
- [Payment Flows](./architecture/04-payment-flows.md) - Stripe Connect integration patterns

### API
- [API Overview](./api/README.md) - REST API documentation
- [Routes](./api/routes.md) - Complete endpoint reference
- [Authentication](./api/authentication.md) - Better Auth implementation
- [Webhooks](./api/webhooks.md) - Stripe webhook handlers

### Widget
- [Widget Overview](./widget/README.md) - React widget architecture
- [Components](./widget/components.md) - Component structure and patterns
- [Embedding Guide](./widget/embedding.md) - Installation for tradies
- [API Integration](./widget/api-integration.md) - Widget ↔ API communication

### Dashboard
- [Dashboard Overview](./dashboard/README.md) - Next.js dashboard architecture
- [Features](./dashboard/features.md) - Feature specifications
- [Pages](./dashboard/pages.md) - Route structure

### Infrastructure
- [Docker](./infrastructure/docker.md) - Container setup and services
- [Traefik](./infrastructure/traefik.md) - Reverse proxy and SSL configuration
- [Docker Swarm](./infrastructure/swarm.md) - Production orchestration
- [CI/CD](./infrastructure/ci-cd.md) - GitHub Actions pipeline

### Development
- [Local Setup](./development/local-setup.md) - Getting started guide
- [Testing Strategy](./development/testing-strategy.md) - Test approach
- [Build Plan](./development/build-plan.md) - Week-by-week implementation guide

## Important Notes

### Widget Architecture
⚠️ **The widget is a static build, NOT a running container**
- Built with Vite → static HTML/JS/CSS
- Served by Traefik or CDN
- No server-side code in widget
- All business logic in API

### Payment Flow
💰 **Money flows directly to tradie Stripe accounts**
- Platform takes 2.5% fee automatically
- No escrow or holding accounts
- Tradie maintains full control
- Instant payouts to tradie

### Middleware Split
🔀 **Two layers of middleware**
- **Traefik**: Infrastructure (rate limiting, SSL, routing)
- **Node.js**: Application (auth, validation, business logic)

## Quick Links

- [Database Schema Diagram](./architecture/03-database-schema.md#entity-relationship-diagram)
- [Stripe Connect Setup](./architecture/04-payment-flows.md#complete-integration-guide)
- [API Endpoint List](./api/routes.md#endpoint-reference)
- [Widget Embedding Code](./widget/embedding.md#installation)
- [Production Deployment](./infrastructure/swarm.md#production-deployment)

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@peepopay.com

---

**Ready to build?** Start with [Local Setup](./development/local-setup.md) →
