# PeepoPay

**Production-grade booking and payment platform for tradies**

PeepoPay enables tradies to accept booking deposits through an embeddable widget while maintaining full control of their Stripe accounts.

## ✨ Features

- 🎯 **Embeddable Booking Widget** - React/Vite widget for seamless customer bookings
- 💰 **Stripe Connect Integration** - Direct-to-tradie payments with automatic platform fees
- 📊 **Tradie Dashboard** - Next.js dashboard for managing services and bookings
- 🔐 **Better Auth** - Secure authentication with Google OAuth + Email/Password
- ⚡ **Real-time Availability** - Manage availability and blocked time slots
- 📧 **Automated Notifications** - Email/SMS notifications for bookings
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
      ┌──────────────┐
      │  API Server  │
      │  (Express)   │
      └──────┬───────┘
             │
      ┌──────▼──────┐
      │  PostgreSQL │
      │   Supabase  │
      └─────────────┘
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
npm run dev:api
npm run dev:dashboard
npm run dev:widget

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
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 | Dashboard application |
| **Widget** | React + Vite | Embeddable booking widget |
| **Backend** | Node.js + Express | REST API server |
| **Database** | PostgreSQL | Primary data store |
| **ORM** | Drizzle ORM | Type-safe database access |
| **Auth** | Better Auth | Authentication & sessions |
| **Payments** | Stripe Connect | Payment processing |
| **Cache** | Redis | Session & data caching |
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

## 🐳 Docker Deployment

### Development

```bash
# Start development services (PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml up -d
```

### Production

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Traefik Dashboard

Access Traefik dashboard at http://localhost:8080

## 🔐 Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/peepopay

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_...

# Better Auth
BETTER_AUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret

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
- **Database Logs**: `docker-compose logs -f postgres`
- **Traefik Dashboard**: http://localhost:8080
- **Drizzle Studio**: `npm run db:studio` (from packages/api)

## 🚢 Production Deployment

### Docker Swarm (Recommended)

1. **Initialize Swarm**
   ```bash
   docker swarm init
   ```

2. **Deploy Stack**
   ```bash
   docker stack deploy -c docker-compose.yml peepopay
   ```

3. **Configure DNS**
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