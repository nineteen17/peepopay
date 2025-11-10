# PeepoPay - Architecture & Build Plan

## Quick Reference

**Stack:**
- Frontend: Next.js (Dashboard) + React/Vite (Widget)
- Backend: Node.js/Express API
- Database: PostgreSQL (Supabase)
- Auth: Better Auth (Google OAuth + Email/Password)
- Payments: Stripe Connect
- Infrastructure: Docker Swarm + Traefik + DigitalOcean
- CI/CD: GitHub Actions + Terraform

**Important Notes:**
- Widget is static build, NOT a running container
- Middleware split: Traefik (infrastructure) / Node.js (application)
- All deposits go directly to tradie's Stripe account (Stripe Connect)
- Platform takes 2.5% fee automatically

---

## Tech Stack (Production-Grade)

### Frontend
- **Next.js** - SSR/SSG for marketing + dashboard
- **React** - widget
- **Tailwind CSS** - styling
- **Vite** - widget bundling (faster than Next for embeds)

### Backend (Decoupled)
- **Node.js/Express** - API server
- **Redis** - session management, rate limiting, caching
- **RabbitMQ** - async jobs: emails, webhooks, notifications
- **PostgreSQL** - Supabase hosted (via connection string)

### Infrastructure
- **DigitalOcean Droplet** - single droplet initially ($12-24/month)
- **Docker Swarm** - orchestration
- **Terraform** - IaaC for DO resources
- **GitHub Actions** - CI/CD pipeline
- **Traefik** - reverse proxy, auto SSL, service discovery

### External Services
- **Supabase** - PostgreSQL hosting only
- **Stripe Connect** - payments
- **Resend** - emails
- **Twilio** - SMS (optional)

---

## Architecture Overview

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

### Traffic Flow
```
Customer → Traefik → Widget (iframe)
                      ↓
                    API Server → Redis (cache/session)
                      ↓
                    PostgreSQL (Supabase)
                      ↓
                    RabbitMQ → Workers (emails, webhooks)
```

---

## Widget Hosting Architecture (Proper Approach)

### Build & Deployment Strategy

**Widget is NOT a running container** - it's a static SPA build:

```
Development:
  npm run dev (Vite) → localhost:5173

Production Build:
  npm run build → dist/
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   ├── index-[hash].css
    └── embed.js (optional standalone script)

Deployment:
  dist/ → Traefik static files OR CDN
```

### Hosting Options

**Option A: Traefik Static Files (Initial)**
```yaml
# docker-compose.yml
services:
  traefik:
    volumes:
      - ./widget/dist:/var/www/widget:ro
      - ./traefik.yml:/etc/traefik/traefik.yml
      - ./dynamic.yml:/etc/traefik/dynamic.yml
      - ./letsencrypt:/letsencrypt
```

**Traefik Configuration:**

```yaml
# traefik.yml (static config)
global:
  checkNewVersion: true
  sendAnonymousUsage: false

log:
  level: INFO
  format: json

accessLog:
  format: json
  
api:
  dashboard: true
  insecure: false  # Secure dashboard with auth

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt
        domains:
          - main: peepopay.com
            sans:
              - "*.peepopay.com"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: peepopay
    swarmMode: true
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

# dynamic.yml (dynamic config with middleware)
http:
  # Middleware definitions
  middlewares:
    # Rate limiting for widget endpoints
    widget-ratelimit:
      rateLimit:
        average: 100
        period: 1m
        burst: 50
    
    # Rate limiting for API endpoints  
    api-ratelimit:
      rateLimit:
        average: 1000
        period: 1h
        burst: 200
    
    # CORS for widget and API
    cors-headers:
      headers:
        accessControlAllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        accessControlAllowOriginList:
          - "*"  # Widget needs to work on any domain
        accessControlAllowHeaders:
          - "Content-Type"
          - "Authorization"
        accessControlMaxAge: 3600
        addVaryHeader: true
    
    # Security headers
    security-headers:
      headers:
        frameDeny: false  # Allow iframe embedding
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
        customFrameOptionsValue: "SAMEORIGIN"
        customResponseHeaders:
          X-Robots-Tag: "noindex, nofollow"
    
    # Compression
    compress:
      compress: {}
    
    # Strip prefix for API routes
    api-stripprefix:
      stripPrefix:
        prefixes:
          - "/api"
    
    # Auth for Traefik dashboard
    dashboard-auth:
      basicAuth:
        users:
          - "admin:$apr1$..." # htpasswd generated
    
    # Redirect www to non-www
    redirect-www:
      redirectRegex:
        regex: "^https://www\\.(.+)"
        replacement: "https://${1}"
        permanent: true

  # Router definitions
  routers:
    # Traefik Dashboard (secured)
    dashboard:
      rule: "Host(`peepopay.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      service: api@internal
      entryPoints:
        - websecure
      middlewares:
        - dashboard-auth
      tls:
        certResolver: letsencrypt
    
    # Widget static files
    widget:
      rule: "Host(`peepopay.com`) && PathPrefix(`/book`)"
      service: widget
      entryPoints:
        - websecure
      middlewares:
        - widget-ratelimit
        - compress
        - security-headers
      tls:
        certResolver: letsencrypt
    
    # API endpoints
    api:
      rule: "Host(`peepopay.com`) && PathPrefix(`/api`)"
      service: api
      entryPoints:
        - websecure
      middlewares:
        - api-ratelimit
        - cors-headers
        - compress
        - security-headers
      tls:
        certResolver: letsencrypt
    
    # Dashboard (Next.js)
    dashboard-app:
      rule: "Host(`peepopay.com`) && PathPrefix(`/dashboard`)"
      service: dashboard
      entryPoints:
        - websecure
      middlewares:
        - compress
        - security-headers
      tls:
        certResolver: letsencrypt
    
    # Root and everything else → marketing site or dashboard
    root:
      rule: "Host(`peepopay.com`)"
      service: dashboard
      entryPoints:
        - websecure
      middlewares:
        - compress
        - security-headers
      tls:
        certResolver: letsencrypt
    
    # Redirect www to non-www
    www-redirect:
      rule: "Host(`www.peepopay.com`)"
      entryPoints:
        - websecure
      middlewares:
        - redirect-www
      service: noop@internal
      tls:
        certResolver: letsencrypt
  
  # Service definitions
  services:
    widget:
      loadBalancer:
        servers:
          - url: "http://widget-server:8080"
        healthCheck:
          path: /health
          interval: 30s
          timeout: 5s
    
    api:
      loadBalancer:
        servers:
          - url: "http://api:4000"
        healthCheck:
          path: /health
          interval: 10s
          timeout: 3s
        sticky:
          cookie:
            name: peepopay_lb
            httpOnly: true
    
    dashboard:
      loadBalancer:
        servers:
          - url: "http://dashboard:3000"
        healthCheck:
          path: /
          interval: 30s
          timeout: 5s

# TCP routers for non-HTTP services (if needed)
tcp:
  routers:
    redis:
      rule: "HostSNI(`*`)"
      service: redis
      entryPoints:
        - redis
  
  services:
    redis:
      loadBalancer:
        servers:
          - address: "redis:6379"
```

**Docker Compose with Traefik:**
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--configFile=/etc/traefik/traefik.yml"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard (secure with auth)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic.yml:/etc/traefik/dynamic.yml:ro
      - ./letsencrypt:/letsencrypt
      - traefik-logs:/var/log/traefik
    networks:
      - peepopay
    deploy:
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
  
  # Simple static file server for widget
  widget-server:
    image: nginx:alpine
    volumes:
      - ./widget/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - peepopay
    deploy:
      replicas: 1
      labels:
        - "traefik.enable=false"
  
  api:
    image: ${DOCKER_USERNAME}/peepopay-api:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://peepopay.com
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
    networks:
      - peepopay
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.api.rule=Host(`peepopay.com`) && PathPrefix(`/api`)"
        - "traefik.http.services.api.loadbalancer.server.port=4000"
        - "traefik.http.middlewares.api-stripprefix.stripprefix.prefixes=/api"
        - "traefik.http.routers.api.middlewares=api-stripprefix,api-ratelimit,cors-headers"
  
  dashboard:
    image: ${DOCKER_USERNAME}/peepopay-dashboard:latest
    environment:
      - NEXT_PUBLIC_API_URL=https://peepopay.com/api
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://peepopay.com
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    networks:
      - peepopay
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.dashboard.rule=Host(`peepopay.com`)"
        - "traefik.http.services.dashboard.loadbalancer.server.port=3000"
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - peepopay
    command: redis-server --appendonly yes
    deploy:
      replicas: 1
      labels:
        - "traefik.enable=false"
  
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - peepopay
    deploy:
      replicas: 1
      labels:
        - "traefik.enable=false"

volumes:
  traefik-logs:
  redis_data:
  rabbitmq_data:

networks:
  peepopay:
    driver: overlay
    attachable: true
```

**Nginx config for widget static files:**
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 8080;
        server_name _;
        
        root /usr/share/nginx/html;
        index index.html;
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Option B: CDN (Scaled Production)**
```
Build → Upload to:
  - Cloudflare R2
  - DigitalOcean Spaces
  - AWS S3 + CloudFront
  - Vercel Edge Network

iframe src="https://cdn.peepopay.com/widget/[hash]/index.html"
```

### Why Static Build is Proper:

✅ **Performance**: Sub-1s load time with CDN
✅ **Scalability**: Infinite horizontal scale (CDN handles traffic)
✅ **Reliability**: No server-side failures (just HTML/JS/CSS)
✅ **Cost**: ~$0-5/month for CDN (vs $12-24/month per container)
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
3. Fetch tradie data: GET /api/tradies/joe-plumber
4. User fills form
5. Create booking: POST /api/bookings
6. Stripe payment: POST /api/payments/intent
7. Confirm via Stripe Elements
8. Update booking: PATCH /api/bookings/:id
```

**All business logic → API server**
**Widget → Pure presentation layer**

---

## Docker Swarm Services

### Service Definitions

```yaml
services:
  - traefik (reverse proxy + SSL + service discovery)
  - api (Node.js API server)
  - dashboard (Next.js SSR)
  - redis (cache + sessions)
  - rabbitmq (message queue)
  - worker (async job processor)
```

**Note:** Widget is NOT a service - it's static files served by Traefik or a simple static file server

### Network Architecture
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

---

## Scaling Strategy

### Phase 1: Single Droplet (MVP)
- **Capacity**: 100 concurrent bookings
- **Cost**: $24/month (4GB droplet)
- **Monitoring**: Resource usage via DO dashboard

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

---

## Payment Flow Architecture

### Stripe Connect Integration
```
┌──────────────────────────────────────────────────────────┐
│                     Payment Flow                          │
│                                                           │
│  Customer                                                 │
│     │                                                     │
│     │ 1. Fill booking form                               │
│     ▼                                                     │
│  Widget (iframe)                                          │
│     │                                                     │
│     │ 2. Create booking + payment intent                 │
│     ▼                                                     │
│  Your API                                                 │
│     │                                                     │
│     │ 3. POST /v1/payment_intents                        │
│     ▼                                                     │
│  Stripe Connect                                           │
│     │                                                     │
│     │ 4. Return client_secret                            │
│     ▼                                                     │
│  Widget                                                   │
│     │                                                     │
│     │ 5. Show Stripe PaymentElement                      │
│     ▼                                                     │
│  Stripe Elements                                          │
│     │                                                     │
│     │ 6. Customer enters card                            │
│     │    (data goes directly to Stripe)                  │
│     ▼                                                     │
│  Stripe Processes Payment                                 │
│     │                                                     │
│     │ 7. Webhook: payment_intent.succeeded               │
│     ▼                                                     │
│  Your API                                                 │
│     │                                                     │
│     │ 8. Update booking status                           │
│     │ 9. Queue confirmation email                        │
│     ▼                                                     │
│  RabbitMQ → Worker → Email sent                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Money Flow with Stripe Connect
```
Customer pays $100 deposit
         │
         ▼
┌─────────────────────┐
│  Stripe Platform    │
│                     │
│  $100 received      │
│  - $2.90 (Stripe)   │
│  - $2.50 (Your fee) │  ◄── Application fee
│  = $94.60           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Tradie's Account    │
│                     │
│ Receives: $94.60    │
└─────────────────────┘
```

### Stripe Connect Account Types
```
┌────────────────────────────────────────────────┐
│              Account Type Selection             │
├────────────────────────────────────────────────┤
│                                                 │
│  Standard Account (Recommended for MVP)        │
│  ✅ Tradie gets full Stripe dashboard          │
│  ✅ Tradie handles their own tax/compliance    │
│  ✅ Simplest integration                       │
│  ✅ Fastest onboarding                         │
│  ❌ Tradie sees "powered by Stripe"            │
│                                                 │
│  Express Account                               │
│  ✅ Embedded onboarding                        │
│  ✅ Limited Stripe dashboard access            │
│  ⚠️  More complex integration                  │
│  ✅ More branded experience                    │
│                                                 │
│  Custom Account (Future)                       │
│  ✅ Full white-label                           │
│  ⚠️  You handle all compliance                 │
│  ⚠️  Most complex integration                  │
│  ⚠️  Requires significant legal setup          │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## Widget Embedding Options

### Option A: iframe Embed (Recommended)
```html
<iframe 
  src="https://peepopay.com/book/tradie-slug" 
  width="100%" 
  height="600px"
></iframe>
```

**Pros:**
- Complete style isolation (no CSS conflicts)
- Security (can't access parent page)
- Easy to maintain

**Cons:**
- Fixed height or requires postMessage for dynamic sizing
- Slightly slower load

### Option B: Script Tag Injection
```html
<script 
  src="https://peepopay.com/widget.js" 
  data-tradie="tradie-slug"
></script>
```

**Pros:**
- Dynamic sizing
- Feels more "native"
- Can inherit some parent styles

**Cons:**
- CSS conflicts possible
- More complex to build
- Security considerations

**Decision: Start with iframe**

---

## Data Model

### Core Tables

```
Users (Tradies)
├─ id
├─ email
├─ business_name
├─ stripe_account_id (Connect)
└─ slug (for widget URL)

Services
├─ id
├─ user_id
├─ name
├─ description
├─ deposit_type (percentage | fixed)
├─ deposit_amount
└─ duration_minutes

Availability
├─ id
├─ user_id
├─ day_of_week
├─ start_time
├─ end_time
└─ blocked_dates[]

Bookings
├─ id
├─ user_id
├─ service_id
├─ customer_name
├─ customer_email
├─ customer_phone
├─ customer_address
├─ booking_date
├─ booking_time
├─ deposit_amount
├─ deposit_status (pending | paid | failed)
├─ stripe_payment_intent_id
├─ total_amount (nullable)
└─ status (pending | confirmed | completed | cancelled)
```

---

## CI/CD Pipeline (GitHub Actions)

### Workflow Architecture
```
┌─────────────────────────────────────────────────┐
│              GitHub Actions Pipeline             │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Code Push to main                           │
│     │                                            │
│     ▼                                            │
│  2. Run Tests                                   │
│     ├─ Unit tests                               │
│     ├─ Integration tests                        │
│     └─ E2E tests                                │
│     │                                            │
│     ▼                                            │
│  3. Build Process                               │
│     ├─ Widget: npm run build → dist/           │
│     ├─ API: Docker build → api:latest          │
│     ├─ Dashboard: Docker build → dashboard:latest│
│     └─ Worker: Docker build → worker:latest    │
│     │                                            │
│     ▼                                            │
│  4. Push to Registry                            │
│     ├─ Docker images → Docker Hub/DO Registry  │
│     └─ Widget dist/ → Artifact storage         │
│     │                                            │
│     ▼                                            │
│  5. Deploy to Droplet                           │
│     ├─ SSH into droplet                         │
│     ├─ Pull latest Docker images               │
│     ├─ Copy widget/dist to static volume       │
│     ├─ Update docker-compose.yml                │
│     └─ docker stack deploy                      │
│     │                                            │
│     ▼                                            │
│  6. Health Checks                               │
│     ├─ API health endpoint                      │
│     ├─ Widget load test (check /book/test)     │
│     ├─ Dashboard accessibility                  │
│     ├─ Traefik dashboard check                  │
│     └─ Stripe Connect webhook test              │
│     │                                            │
│     ▼                                            │
│  7. Rollback on Failure                         │
│     └─ Revert to previous version               │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Widget Deployment Strategy

**GitHub Actions Job:**
```yaml
jobs:
  deploy-widget:
    steps:
      - name: Build Widget
        run: |
          cd widget
          npm ci
          npm run build
      
      - name: Deploy to Static Volume
        run: |
          rsync -avz --delete ./widget/dist/ \
            user@droplet:/opt/peepopay/widget/dist/
      
      # Alternative: Deploy to CDN
      - name: Deploy to DO Spaces
        run: |
          s3cmd sync --delete-removed \
            ./widget/dist/ \
            s3://peepopay-cdn/widget/
```

---

## Terraform Infrastructure

### Resource Architecture
```
┌────────────────────────────────────────────┐
│         Terraform State (S3/DO)            │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│        DigitalOcean Resources              │
├────────────────────────────────────────────┤
│                                             │
│  Droplet (Ubuntu 24)                       │
│  ├─ Firewall rules                         │
│  ├─ SSH keys                               │
│  └─ Tags                                   │
│                                             │
│  Domain (peepopay.com)                     │
│  ├─ DNS records                            │
│  └─ SSL certificates (Let's Encrypt)       │
│                                             │
│  Load Balancer (future)                    │
│  └─ Health checks                          │
│                                             │
│  Spaces (CDN for widget)                   │
│  └─ Static assets                          │
│                                             │
└────────────────────────────────────────────┘
```

---

## MVP Scope (Weeks 1-6)

### Customer-Facing Widget (Embeddable)
**Core functionality:**
- Service selector dropdown
- Date/time picker with availability
- Contact form (Name, phone, email, address)
- Deposit payment (Stripe integration)
- Confirmation page with receipt

**Technical requirements:**
- iframe embed
- Mobile-first responsive design
- Sub-3 second load time
- Works on Wix, WordPress, Squarespace, custom HTML sites
- Minimal CSS conflicts with host site

### Tradesperson Dashboard
**Core functionality:**
- Service setup (Add services, set deposit amounts)
- Availability calendar (Set working hours, block dates)
- Booking list (Upcoming bookings with customer details)
- Charge remaining balance (Stripe terminal link)
- Basic settings (Business name, logo, contact info)

**Technical requirements:**
- Web-based (no mobile app needed yet)
- Simple, clean UI (like Stripe Dashboard)
- Email notifications on new bookings
- SMS notifications (optional, Twilio)

---

## Week-by-Week Build Plan

### Week 1: Foundation
- ✅ Set up project repositories (API, Dashboard, Widget)
- ✅ Configure Docker Swarm locally
- ✅ Set up PostgreSQL (Supabase)
- ✅ Basic auth (email/password)
- ✅ Create dashboard shell

### Week 2: Dashboard Core
- ✅ Service CRUD interface
- ✅ Availability calendar UI
- ✅ Stripe Connect onboarding flow
- ✅ Basic settings page

### Week 3: Widget Development
- ✅ Build embeddable iframe
- ✅ Service selector component
- ✅ Date/time picker with availability
- ✅ Contact form

### Week 4: Payment Integration
- ✅ Stripe payment intent creation
- ✅ Deposit collection flow
- ✅ Confirmation page
- ✅ Email receipts (Resend)

### Week 5: Bookings Management
- ✅ Booking list view in dashboard
- ✅ Email notifications for tradies
- ✅ SMS notifications (optional)
- ✅ Charge remaining balance feature

### Week 6: Testing & Polish
- ✅ Test on Wix/WordPress/custom sites
- ✅ Mobile responsiveness
- ✅ Error handling
- ✅ Performance optimization
- ✅ Deploy to production

---

## Success Metrics for Phase 1

By end of Week 6:
- ✅ 5 beta customers with widget installed
- ✅ 10+ real bookings through the system
- ✅ At least 3 deposits collected successfully
- ✅ Zero critical bugs in payment flow
- ✅ Sub-3 second widget load time
- ✅ One strong testimonial

---

## Stripe PaymentElement Integration

### The Nested Widget Approach

**Your widget responsibilities:**
- Service selection UI
- Date/time picker UI
- Contact form UI
- API integration
- State management
- Confirmation page
- Wrapping Stripe Elements

**Stripe's responsibilities:**
- Card input fields
- Payment processing
- 3DS authentication
- PCI compliance
- Fraud detection
- Global payment support

### Payment Element Features (Automatic)
```
┌─────────────────────────────────────────────┐
│ Card Number                                 │
│ •••• •••• •••• 4242                        │
├─────────────────────────┬───────────────────┤
│ MM / YY                 │ CVC               │
│ 12 / 25                 │ 123               │
└─────────────────────────┴───────────────────┘

Built-in features:
✅ Real-time validation
✅ Auto-formatting
✅ Card brand detection
✅ Accessibility
✅ Mobile optimized
✅ Responsive
```

**Automatically supports:**
- Credit/debit cards
- Google Pay
- Apple Pay
- Link (Stripe's one-click checkout)
- Buy Now Pay Later (Afterpay, Klarna)
- Bank transfers

---

## Cost Breakdown

### MVP Costs (Monthly)
```
DigitalOcean Droplet (4GB)     $24
Supabase (Free tier)           $0
Stripe Connect (2.9% + $0.30)  Variable
Resend (3k emails/month)       $0
Domain (peepopay.com)          $12/year
─────────────────────────────────
Total:                         ~$25/month
```

### At Scale (1000 bookings/month)
```
DigitalOcean (3x droplets)     $72
DigitalOcean Load Balancer     $12
Supabase Pro                   $25
Managed Redis                  $15
Resend Pro                     $20
─────────────────────────────────
Total:                         ~$144/month
```

---

## Beta Customer Acquisition (Parallel to Build)

### Week 1-2: Identify 20 local tradies
- Google: "plumber [your suburb]" + has website
- Check: Do they have online booking? (90% don't)
- Save: Contact info

### Week 3-4: Cold outreach
- Email: "I noticed you don't have online booking. I'm building a free widget that collects deposits automatically. Can I give you early access?"
- Offer: Free for 3 months

### Week 5-6: Install on beta sites
- Get 5 tradies to install
- Watch real usage
- Iterate based on feedback

---

---

# PART 2: DETAILED IMPLEMENTATION

## API Structure - Architecture Overview

### Core Components

**1. Entry Point** (`api/src/index.js`)
- Express app initialization
- Middleware mounting (CORS, body-parser, helmet, rate limiting)
- Route registration
- Error handling middleware
- Graceful shutdown handlers
- Worker thread initialization for background jobs

**2. Database Layer** (`api/prisma/schema.prisma`)
- **Models**: User, Service, Availability, Booking, Settings, BlockedDate
- **Key relationships**: User → Services, User → Bookings, Service → Bookings
- **Indexes**: email, slug, booking dates for query performance
- **Enums**: depositType (percentage/fixed), bookingStatus (pending/confirmed/completed/cancelled)

**3. Route Structure** (`api/src/routes/`)

```
/api/auth
  POST /signup - Create user account
  POST /login - Email/password login
  POST /logout - Invalidate session
  GET /me - Get current user profile
  
/api/services
  GET / - List user's services
  POST / - Create new service
  GET /:id - Get service details
  PUT /:id - Update service
  DELETE /:id - Soft delete service
  
/api/availability
  GET / - Get user's availability rules
  POST / - Set availability (day/time ranges)
  PUT /:id - Update availability rule
  DELETE /:id - Remove availability rule
  POST /blocked-dates - Block specific dates
  GET /slots - Get available time slots (for widget)
  
/api/bookings
  GET / - List bookings (with filters: upcoming, past, status)
  GET /:id - Get booking details
  POST / - Create booking (called by widget)
  PUT /:id/status - Update booking status
  POST /:id/charge-balance - Charge remaining balance via Stripe
  
/api/webhooks
  POST /stripe - Handle Stripe webhooks (payment success/failure)
  
/api/widget
  GET /:slug/config - Get tradie config for widget (services, branding)
  GET /:slug/availability - Get available slots for date
  POST /:slug/book - Create booking + process deposit
```

### Controllers, Services & Middleware

**Controllers** (`api/src/controllers/`)
- **Pattern**: Thin controllers - validation → service call → response
- `authController.js` - Auth logic, JWT generation, password hashing
- `servicesController.js` - CRUD operations for services
- `availabilityController.js` - Availability management, slot calculation
- `bookingsController.js` - Booking creation, status updates, payment charging
- `webhooksController.js` - Stripe webhook verification, event handling
- `widgetController.js` - Public endpoints for widget (no auth required)

**Services Layer** (`api/src/services/`)
- `stripeService.js` - Connect account creation/onboarding, Payment intent creation, Charge capture
- `queueService.js` - RabbitMQ connection management, publish methods
- `availabilityService.js` - Calculate available slots, check if time slot is available
- `emailService.js` - Email template rendering, send via Resend API
- `smsService.js` - Send via Twilio
- `cacheService.js` - Redis wrapper for common patterns

**Middleware** (`api/src/middleware/`)
- `auth.js` - JWT verification, attach req.user
- `rateLimit.js` - Redis-based rate limiting (100 req/min per IP)
- `validateRequest.js` - Joi/Zod schema validation
- `errorHandler.js` - Centralized error responses
- `cors.js` - CORS configuration (allow widget embeds)

**Workers** (`api/src/workers/`)
- `emailWorker.js` - Listen on emails queue, send via Resend, retry logic
- `smsWorker.js` - Listen on sms queue, send via Twilio

### Key Patterns & Decisions

**Authentication Flow (Better Auth)**
- **Better Auth** integration with Google OAuth + Email/Password
- Session management via Better Auth (secure, httpOnly cookies)
- Google OAuth for quick tradie signup
- Email/Password fallback for tradies without Google
- Session stored in database (revokable, secure)
- CSRF protection built-in
- Better Auth handles: password hashing, email verification, password reset

**Better Auth Configuration:**
```typescript
// api/src/lib/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // Update every 24 hours
  },
  user: {
    additionalFields: {
      businessName: {
        type: "string",
        required: false
      },
      slug: {
        type: "string",
        required: false,
        unique: true
      },
      stripeAccountId: {
        type: "string",
        required: false
      },
      stripeOnboarded: {
        type: "boolean",
        defaultValue: false
      }
    }
  }
})

// Middleware for protected routes
export const requireAuth = async (req, res, next) => {
  const session = await auth.api.getSession({ 
    headers: req.headers 
  })
  
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: "Unauthorized" 
    })
  }
  
  req.user = session.user
  req.session = session
  next()
}
```

**Auth Routes:**
```typescript
// api/src/routes/auth.ts
import { auth } from '../lib/auth'

// Better Auth handles these automatically:
// POST /api/auth/sign-in/email
// POST /api/auth/sign-up/email  
// POST /api/auth/sign-in/social (Google)
// POST /api/auth/sign-out
// GET  /api/auth/callback/google
// POST /api/auth/forget-password
// POST /api/auth/reset-password

router.all('/auth/*', auth.handler)

// Custom post-signup logic
router.post('/auth/complete-profile', requireAuth, async (req, res) => {
  const { businessName } = req.body
  
  // Generate slug from business name
  const slug = slugify(businessName)
  
  // Update user with business info
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      businessName,
      slug
    }
  })
  
  res.json({ success: true, slug })
})
```

**Dashboard Login Flow:**
```typescript
// dashboard/src/app/login/page.tsx
import { signIn } from "@/lib/auth-client"

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard"
    })
  }
  
  const handleEmailLogin = async (data) => {
    await signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: "/dashboard"
    })
  }
  
  return (
    <div>
      <button onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
      
      <form onSubmit={handleEmailLogin}>
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button type="submit">Sign in</button>
      </form>
    </div>
  )
}
```

**Booking Creation Flow**
1. Widget calls `POST /api/widget/:slug/book`
2. Validate availability (double-check slot not taken)
3. Create Stripe PaymentIntent for deposit
4. Create Booking record (status: pending)
5. Return client secret to widget
6. Widget handles 3DS/confirmation
7. Webhook confirms payment → update Booking (status: confirmed)
8. Queue email/SMS notifications

**Availability Calculation**
- Cache available slots per day in Redis (TTL: 5 minutes)
- On booking creation, invalidate cache for that date
- Algorithm: Generate slots from availability rules → subtract booked slots → subtract blocked dates

**Error Handling Strategy**
- Custom error classes: ValidationError, AuthError, NotFoundError, StripeError
- All errors caught by global error handler
- 4xx for client errors, 5xx for server errors

**Caching Strategy**
- Heavy cache: Available slots (5 min TTL)
- Light cache: Service lists, user settings (10 min TTL)
- No cache: Bookings, real-time data
- Cache invalidation on mutations

---

## Stripe Connect Integration - Complete Flow

### The Problem We're Solving
- ❌ **Traditional Stripe**: Money goes to YOUR Stripe account → you manually pay tradies (terrible)
- ✅ **Stripe Connect**: Money goes DIRECTLY to tradie's Stripe account → you take a platform fee automatically (perfect)

### Account Architecture

```
Platform (You)
  └─> Stripe Account (platform_stripe_account_id)
      └─> Connected Accounts (tradie_stripe_account_ids)
          ├─> Payments flow directly to tradies
          └─> Platform takes 2.5% application fee
```

### Complete Flow (Step by Step)

#### Step 1: Tradie Signs Up on Your Platform

**User registers**:
```
POST /api/auth/signup
{
  "email": "joe@plumbing.com",
  "password": "...",
  "businessName": "Joe's Plumbing"
}
```

API creates User record with:
- `stripeAccountId: null` (not connected yet)
- `stripeOnboarded: false`

#### Step 2: Tradie Clicks "Connect Stripe" in Dashboard

Dashboard shows:
```
⚠️ You need to connect Stripe to receive payments
[Connect Stripe Account] button
```

When clicked:
```
POST /api/stripe/connect/create-account
```

**API Flow**:
1. Create Stripe Connected Account (type: 'standard')
2. Save `stripeAccountId` to database
3. Create onboarding link
4. Return onboarding URL
5. Dashboard redirects tradie to Stripe onboarding

#### Step 3: Tradie Completes Stripe Onboarding

Stripe handles:
- Bank account verification
- Identity verification
- Business details
- Tax information
- Terms of Service acceptance

After completion, Stripe redirects to:
```
https://peepopay.com/dashboard/stripe/complete?success=true
```

Your frontend calls:
```
GET /api/stripe/connect/status
```

API checks if onboarding complete and updates database.

#### Step 4: Customer Books via Widget

**Widget creates booking**:
```
POST /api/widget/plumber-joe/book
{
  "serviceId": "svc_123",
  "date": "2025-10-27",
  "time": "14:00",
  "customer": {...}
}
```

**API creates PaymentIntent on TRADIE's connected account**:

Critical code pattern:
```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(depositAmount * 100),  // Convert to cents
  currency: 'nzd',
  application_fee_amount: platformFee,  // Your 2.5% cut
  metadata: { bookingId, userId, serviceId },
  receipt_email: customer.email
}, {
  stripeAccount: tradie.stripeAccountId  // KEY: Charge to tradie's account
})
```

**Money flow**:
- Customer pays $100
- Stripe fees: ~$3 (2.9% + $0.30)
- Platform fee: $2.50 (2.5%)
- Tradie receives: $94.50

**Response to widget**:
```json
{
  "success": true,
  "data": {
    "bookingId": "book_abc123",
    "depositAmount": 100.00,
    "stripeClientSecret": "pi_xxx_secret_yyy",
    "stripeAccountId": "acct_tradie123"  // CRITICAL for widget
  }
}
```

#### Step 5: Widget Handles Payment with Connected Account

**Widget initializes Stripe with connected account**:
```typescript
const stripe = await loadStripe(
  process.env.STRIPE_PUBLISHABLE_KEY,
  {
    stripeAccount: stripeAccountId  // KEY: Connect to tradie's account
  }
)

// Confirm payment
const { error, paymentIntent } = await stripe.confirmCardPayment(
  stripeClientSecret,
  {
    payment_method: {
      card: elements.getElement(CardElement),
      billing_details: {
        name: customer.name,
        email: customer.email
      }
    }
  }
)
```

**Stripe Elements automatically handles**:
- 3DS authentication (if required)
- Card validation
- Error messages
- PCI compliance

#### Step 6: Webhook Confirms Payment

Stripe sends webhook:
```
POST /api/webhooks/stripe
Event: payment_intent.succeeded
```

**API Flow**:
1. Verify webhook signature
2. Extract `bookingId` from metadata
3. Update booking status: `confirmed`
4. Update depositStatus: `paid`
5. Queue email to customer
6. Queue email/SMS to tradie

---

## Widget Architecture - Complete Breakdown

### Core Concept
Self-contained React app that embeds into tradie websites via iframe and handles the entire booking + deposit payment flow.

### Embed Method: iframe (Recommended)

```html
<iframe 
  src="https://peepopay.com/widget/plumber-joe" 
  width="100%" 
  height="700px"
  frameborder="0"
  id="peepopay-widget"
></iframe>
```

**Pros**:
- Complete style isolation (no CSS conflicts)
- Security sandboxing
- Works on ANY website platform
- Easy to debug

### Widget User Journey

```
1. Customer lands on tradie's website
2. Sees embedded Peepopay widget
3. Selects service → API: GET /api/widget/:slug/config
4. Picks date → API: GET /api/widget/:slug/availability?date=YYYY-MM-DD
5. Selects time slot
6. Fills contact form
7. Reviews booking summary
8. Clicks "Pay Deposit & Book" → API: POST /api/widget/:slug/book
9. Stripe Elements modal appears
10. Customer enters card, handles 3DS if needed
11. Payment succeeds → Confirmation page
12. Webhook updates booking → Emails sent
```

### Widget Tech Stack

- **Build Tool**: Vite (fast dev, optimized builds)
- **Framework**: React (component reusability)
- **State**: useState + useReducer (no Redux)
- **Styling**: Tailwind CSS (rapid development, small bundle)
- **Form Handling**: React Hook Form + Zod validation
- **Date Picker**: react-day-picker
- **Payment**: Stripe Elements (React)

### Widget Component Structure

```
widget/src/
├── App.tsx                    # Root component, state management
├── main.tsx                   # Entry point
├── components/
│   ├── StepIndicator.tsx      # Visual progress
│   ├── ServiceSelector.tsx    # Step 1: Pick service
│   ├── DatePicker.tsx         # Step 2: Pick date
│   ├── TimeSlotPicker.tsx     # Step 3: Pick time
│   ├── ContactForm.tsx        # Step 4: Enter details
│   ├── BookingSummary.tsx     # Review before payment
│   ├── PaymentModal.tsx       # Stripe Elements
│   ├── ConfirmationPage.tsx   # Success state
│   └── ErrorMessage.tsx       # Error display
├── hooks/
│   ├── useWidgetConfig.ts     # Fetch tradie config
│   ├── useAvailability.ts     # Fetch available slots
│   ├── useBooking.ts          # Create booking
│   └── useStripe.ts           # Payment confirmation
├── lib/
│   ├── api.ts                 # Axios instance
│   ├── types.ts               # TypeScript types
│   └── validation.ts          # Zod schemas
└── styles/
    └── index.css              # Tailwind entry
```

### State Management Pattern

```typescript
type WidgetState = {
  step: 'service' | 'date' | 'time' | 'contact' | 'summary' | 'payment' | 'confirmation'
  
  config: {
    businessName: string
    services: Service[]
    brandColor?: string
  } | null
  
  selectedService: Service | null
  selectedDate: string | null
  selectedTime: string | null
  contactInfo: {
    name: string
    email: string
    phone: string
    address: string
  }
  
  bookingId: string | null
  depositAmount: number | null
  stripeClientSecret: string | null
  
  loading: boolean
  error: string | null
}
```

### Key Widget Features

**1. Dynamic Height (iframe postMessage)**
```typescript
// Widget sends height to parent
useEffect(() => {
  const sendHeight = () => {
    const height = document.documentElement.scrollHeight
    window.parent.postMessage({
      type: 'PEEPOPAY_RESIZE',
      height: height
    }, '*')
  }
  sendHeight()
}, [step])
```

**2. Brand Customization**
```html
<iframe src="https://peepopay.com/widget/plumber-joe?color=3B82F6"></iframe>
```

**3. Mobile Responsiveness**
- Breakpoints: Mobile < 640px, Tablet 640-1024px, Desktop > 1024px
- Large touch targets (min 44x44px)
- Proper input types (tel, email)

**4. Accessibility**
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader support

### API Integration Points

**1. Widget Initialization**
```
GET /api/widget/:slug/config

Response:
{
  "businessName": "Joe's Plumbing",
  "services": [
    {
      "id": "svc_123",
      "name": "Standard Callout",
      "depositType": "fixed",
      "depositAmount": 50,
      "durationMinutes": 60
    }
  ]
}
```

**2. Availability Check**
```
GET /api/widget/:slug/availability?date=2025-10-27&serviceId=svc_123

Response:
{
  "date": "2025-10-27",
  "slots": [
    { "time": "09:00", "available": true },
    { "time": "10:00", "available": true },
    { "time": "11:00", "available": false },
    ...
  ]
}
```

**3. Booking Creation**
```
POST /api/widget/:slug/book
{
  "serviceId": "svc_123",
  "date": "2025-10-27",
  "time": "14:00",
  "customer": {
    "name": "Sarah Johnson",
    "email": "sarah@example.com",
    "phone": "+64 21 999 8888",
    "address": "123 Main St, Auckland"
  }
}

Response:
{
  "bookingId": "book_abc123",
  "depositAmount": 50.00,
  "stripeClientSecret": "pi_xxx_secret_yyy",
  "stripeAccountId": "acct_tradie123"
}
```

### Payment Flow in Widget

```typescript
const PaymentModal = ({ clientSecret, amount, stripeAccountId, onSuccess }) => {
  const stripe = useStripe()
  const elements = useElements()
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: customer.name,
            email: customer.email
          }
        }
      }
    )
    
    if (error) {
      setError(error.message)
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={cardElementOptions} />
      <button disabled={!stripe || loading}>
        Pay ${amount} Deposit
      </button>
    </form>
  )
}
```

### Error Handling

**Error Types**:
- Network errors → "Connection issue, please try again"
- Validation errors → Inline on form fields
- Availability errors → "This time was just booked, please select another"
- Payment errors → Show Stripe error message
- Server errors → "Something went wrong, contact [tradie phone]"

**Retry Strategy**:
- Failed API calls: Retry once automatically after 2s
- Failed payments: No automatic retry (user can re-enter card)

### Performance Optimizations

**Bundle Size**: Target < 200KB gzipped
- Tree-shake unused Stripe elements
- Lazy load PaymentModal
- Use Tailwind PurgeCSS
- Compress with Brotli

**Load Time**: Target < 2 seconds to interactive
- Preload config API call
- Cache static assets (1 year)
- Use CDN for widget.js
- Inline critical CSS

**API Calls**: Minimize requests
- Fetch config once on mount
- Only fetch availability when date changes
- Debounce availability calls (500ms)

### Security Considerations

**iframe Sandbox**:
```html
<iframe 
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
  src="...">
</iframe>
```

**Input Sanitization**:
- Strip HTML tags from name/address
- Validate email/phone formats
- Prevent XSS via React's default escaping

**Stripe Security**:
- Never expose secret key to widget
- Use PaymentIntents (not Charges)
- Implement webhook signature verification
- Use Stripe Elements (PCI compliant)

---

## Dashboard Architecture (Next.js)

### Purpose
Tradie-facing application for managing services, bookings, and settings.

### Key Features
- **Auth**: Login/signup, password reset
- **Services Management**: CRUD for services with deposit configuration
- **Availability Calendar**: Set working hours, block dates
- **Bookings List**: View upcoming/past bookings, filter by status
- **Stripe Onboarding**: Connect Stripe account flow
- **Settings**: Business info, widget customization
- **Analytics**: Basic metrics (bookings/week, revenue)

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context + SWR for data fetching
- **Forms**: React Hook Form + Zod
- **Auth**: JWT tokens (stored in HTTP-only cookies)

---

## Configuration & Environment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@supabase.host:5432/peepopay

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ  
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
RABBITMQ_USER=peepopay
RABBITMQ_PASS=your-secure-password

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_FEE_PERCENTAGE=2.5

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here  # Generate: openssl rand -base64 32
BETTER_AUTH_URL=https://peepopay.com
BETTER_AUTH_TRUSTED_ORIGINS=https://peepopay.com

# Google OAuth (for Better Auth)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=bookings@peepopay.com

# SMS (Twilio - optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+64...

# App
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://peepopay.com

# Docker Registry
DOCKER_USERNAME=your-dockerhub-username
```

### Traefik Middleware Cheat Sheet

**Rate Limiting**:
```yaml
# 100 requests per minute
widget-ratelimit:
  rateLimit:
    average: 100
    period: 1m
    burst: 50
```

**CORS Headers**:
```yaml
cors-headers:
  headers:
    accessControlAllowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    accessControlAllowOriginList:
      - "*"  # Widget embeds on any domain
    accessControlAllowHeaders:
      - "Content-Type"
      - "Authorization"
    accessControlMaxAge: 3600
```

**Security Headers**:
```yaml
security-headers:
  headers:
    frameDeny: false  # Allow iframe
    contentTypeNosniff: true
    browserXssFilter: true
    referrerPolicy: "strict-origin-when-cross-origin"
```

**Compression**:
```yaml
compress:
  compress: {}
```

**IP Whitelisting** (for admin routes):
```yaml
admin-whitelist:
  ipWhiteList:
    sourceRange:
      - "127.0.0.1/32"
      - "your-office-ip/32"
```

**Redirect HTTP to HTTPS**:
```yaml
redirect-https:
  redirectScheme:
    scheme: https
    permanent: true
```

---

## Better Auth Setup Guide

### 1. Install Better Auth

```bash
npm install better-auth
```

### 2. Prisma Schema Updates

```prisma
// Add to your existing schema
model User {
  id                String         @id @default(cuid())
  email             String         @unique
  emailVerified     Boolean        @default(false)
  name              String?
  image             String?
  businessName      String?
  slug              String?        @unique
  stripeAccountId   String?        @unique
  stripeOnboarded   Boolean        @default(false)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  accounts          Account[]
  sessions          Session[]
  services          Service[]
  bookings          Booking[]
  
  @@index([email])
  @@index([slug])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
}
```

### 3. Better Auth Configuration

```typescript
// api/src/lib/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./database"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Send email via Resend
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `Click here to reset: ${url}`
      })
    },
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `Click here to verify: ${url}`
      })
    }
  },
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`
    }
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },
  
  user: {
    additionalFields: {
      businessName: {
        type: "string",
        required: false
      },
      slug: {
        type: "string",
        required: false,
        unique: true
      },
      stripeAccountId: {
        type: "string",
        required: false
      },
      stripeOnboarded: {
        type: "boolean",
        defaultValue: false
      }
    }
  },
  
  advanced: {
    generateId: () => {
      // Use cuid for consistency with Prisma
      return createId()
    }
  }
})

// Export type-safe auth API
export type Auth = typeof auth
```

### 4. API Integration

```typescript
// api/src/index.ts
import express from 'express'
import { auth } from './lib/auth'

const app = express()

// Better Auth handles all auth routes
app.all('/auth/*', auth.handler)

// Middleware for protected routes
export const requireAuth = async (req, res, next) => {
  const session = await auth.api.getSession({ 
    headers: req.headers 
  })
  
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: "Unauthorized" 
    })
  }
  
  req.user = session.user
  req.session = session
  next()
}

// Protected route example
app.get('/api/services', requireAuth, async (req, res) => {
  const services = await prisma.service.findMany({
    where: { userId: req.user.id }
  })
  res.json({ success: true, data: services })
})
```

### 5. Dashboard Client Setup

```typescript
// dashboard/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL
})

export const { signIn, signOut, signUp, useSession } = authClient
```

### 6. Login Page Example

```typescript
// dashboard/src/app/login/page.tsx
"use client"
import { useState } from "react"
import { signIn } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const handleGoogleLogin = async () => {
    setLoading(true)
    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard"
    })
  }
  
  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    
    const result = await signIn.email({
      email,
      password,
      callbackURL: "/dashboard"
    })
    
    if (result.error) {
      alert(result.error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }
  
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Sign in to PeepoPay</h1>
      
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full mb-4 py-2 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <span className="flex items-center justify-center">
          Continue with Google
        </span>
      </button>
      
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>
      
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            name="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      
      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <a href="/signup" className="text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </div>
  )
}
```

### 7. Protected Dashboard Layout

```typescript
// dashboard/src/app/dashboard/layout.tsx
"use client"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({ children }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])
  
  if (isPending) {
    return <div>Loading...</div>
  }
  
  if (!session) {
    return null
  }
  
  return (
    <div>
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between">
          <span>Welcome, {session.user.name || session.user.email}</span>
          <button
            onClick={() => signOut()}
            className="text-red-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </nav>
      
      <main>{children}</main>
    </div>
  )
}
```

---

### Prerequisites Checklist

**1. Domain & Accounts**
- ✅ Register peepopay.com
- ⬜ Set up Stripe account (get API keys)
- ⬜ Set up Supabase account (get PostgreSQL connection string)
- ⬜ Set up Resend account (get API key)
- ⬜ Set up DigitalOcean account (get API token)

**2. Development Environment**
- ⬜ Install Docker Desktop
- ⬜ Install Node.js 20+
- ⬜ Install Terraform
- ⬜ Generate SSH key for droplet access

**3. Project Setup**
- ⬜ Create GitHub repository
- ⬜ Set up local development environment
- ⬜ Create `.env` files with all required secrets
- ⬜ Initialize Git repository

**4. Infrastructure**
- ⬜ Run Terraform to provision droplet
- ⬜ Configure DNS records
- ⬜ Set up GitHub Actions secrets

**5. Beta Customer List**
- ⬜ Research 20 local tradies with websites
- ⬜ Verify they don't have online booking
- ⬜ Prepare cold outreach email template

---

## Middleware Separation: Traefik vs Node.js

### The Rule of Thumb

**Traefik handles:** Infrastructure-level concerns (network, traffic, generic security)  
**Node.js handles:** Application-level concerns (business logic, auth, validation)

---

### Traefik Middleware (Infrastructure Layer)

**What Traefik SHOULD handle:**

✅ **SSL/TLS Termination** - Centralized certificate management  
✅ **Generic Rate Limiting** - Block DDoS at the edge (100 req/min per IP)  
✅ **Basic CORS** - Static rules like "allow *" for widget embeds  
✅ **Compression** - Gzip all responses automatically  
✅ **Generic Security Headers** - XSS protection, content-type sniffing  
✅ **URL Rewriting** - Strip `/api` prefix before forwarding  
✅ **Load Balancing** - Distribute across multiple API instances  
✅ **HTTP Access Logging** - Log all requests (IP, path, status)

⚠️ **Limitations:**
- Can't access database
- Can't understand business logic
- Can't differentiate users
- Can't do dynamic configuration based on data

---

### Node.js Middleware (Application Layer)

**What Node.js SHOULD handle:**

✅ **Authentication** - Verify Better Auth sessions, check user identity  
✅ **Authorization** - Check user permissions, resource ownership  
✅ **Request Validation** - Validate request bodies with Zod schemas  
✅ **User-specific Rate Limiting** - Different limits per user tier  
✅ **Dynamic CORS** - Allow origins based on database configuration  
✅ **Business Logic** - Availability checks, booking conflicts  
✅ **Error Handling** - Transform app errors into API responses  
✅ **Audit Logging** - Log business events (who did what)  
✅ **Request Context** - Enrich requests with user/business data

❌ **Don't do in Node.js:**
- SSL/TLS termination (Traefik does this)
- Load balancing (Traefik does this)
- Generic compression (Traefik does this)

---

### The Complete Stack Visualization

```
Client Request
      │
      ▼
┌─────────────────────────────┐
│   TRAEFIK (Infrastructure)  │
├─────────────────────────────┤
│ • SSL Termination           │
│ • IP-based Rate Limiting    │
│ • Static CORS               │
│ • Compression               │
│ • Security Headers          │
│ • Strip /api prefix         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   NODE.JS (Application)     │
├─────────────────────────────┤
│ • JSON Body Parsing         │
│ • Request Logging           │
│ • Add Request ID            │
│ • Authentication            │
│ • Authorization             │
│ • User Rate Limiting        │
│ • Request Validation        │
│ • Business Logic            │
│ • Error Handling            │
└──────────┬──────────────────┘
           │
           ▼
        Response
```

---

### Quick Decision Matrix

| Feature | Traefik | Node.js |
|---------|:-------:|:-------:|
| SSL/TLS | ✅ | ❌ |
| Load Balancing | ✅ | ❌ |
| Generic Rate Limiting (IP) | ✅ | ❌ |
| User Rate Limiting | ❌ | ✅ |
| Static CORS | ✅ | ❌ |
| Dynamic CORS | ❌ | ✅ |
| Compression | ✅ | ❌ |
| Security Headers | ✅ | ❌ |
| Authentication | ❌ | ✅ |
| Authorization | ❌ | ✅ |
| Request Validation | ❌ | ✅ |
| Business Logic | ❌ | ✅ |
| Database Access | ❌ | ✅ |
| Error Handling | ❌ | ✅ |
| Audit Logging | ❌ | ✅ |

---

### Node.js Middleware Implementation

```javascript
// api/src/index.js
import express from 'express'
import helmet from 'helmet'
import { auth } from './lib/auth'

const app = express()

// ===== BASIC MIDDLEWARE =====
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Defense-in-depth security (Traefik handles most)
app.use(helmet({
  frameguard: false, // Allow iframe for widget
  contentSecurityPolicy: false
}))

// Request logging
app.use((req, res, next) => {
  req.id = nanoid()
  console.log({
    id: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip
  })
  next()
})

// ===== AUTH ROUTES (Better Auth) =====
app.all('/auth/*', auth.handler)

// ===== PROTECTED API ROUTES =====
app.use('/services', requireAuth, servicesRouter)
app.use('/bookings', requireAuth, bookingsRouter)
app.use('/availability', requireAuth, availabilityRouter)
app.use('/stripe', requireAuth, stripeRouter)

// ===== PUBLIC WIDGET ROUTES (No auth) =====
app.use('/widget', widgetRouter)

// ===== WEBHOOK ROUTES (Signature verification) =====
app.use('/webhooks', webhooksRouter)

// ===== ERROR HANDLER (MUST BE LAST) =====
app.use((err, req, res, next) => {
  console.error({ id: req.id, error: err })
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: "Unauthorized" })
  }
  
  res.status(500).json({ error: "Internal server error" })
})

app.listen(4000)
```

---

### Summary

**Use Traefik for:**
- Infrastructure concerns that apply to ALL requests
- Things that don't need database access
- Generic security and performance

**Use Node.js for:**
- Application concerns specific to YOUR business
- Things that need database/user context
- Complex logic and validation

**The golden rule:** If it needs to know about users, data, or business rules → Node.js. If it's generic network/HTTP stuff → Traefik.

---

## Stripe Integration - Complete Implementation

### Overview: What's Covered vs What's Missing

✅ **Already Documented:**
- Stripe Connect account creation
- Onboarding flow for tradies
- Payment intent creation (deposit)
- Widget payment flow
- Money flow and platform fees

❌ **Missing Implementation Details:**
- Webhook signature verification
- Webhook event handling
- Charging remaining balance
- Failed payment handling
- Refund handling
- Stripe error handling
- Testing strategy

---

### 1. Webhook Implementation (Critical)

#### Webhook Signature Verification

```javascript
// api/src/routes/webhooks.js
import express from 'express'
import Stripe from 'stripe'
import { prisma } from '../lib/database'
import { queueService } from '../services/queue'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const router = express.Router()

// IMPORTANT: Use raw body for webhook signature verification
router.post('/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    
    let event
    
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }
    
    // Handle the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object)
          break
          
        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object)
          break
          
        case 'account.updated':
          await handleAccountUpdate(event.data.object)
          break
          
        case 'charge.refunded':
          await handleRefund(event.data.object)
          break
          
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
      
      res.json({ received: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }
)

export default router
```

#### Payment Success Handler

```javascript
// api/src/services/webhooks/handlePaymentSuccess.js
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId
  
  if (!bookingId) {
    console.error('No bookingId in payment intent metadata')
    return
  }
  
  // Update booking status
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      depositStatus: 'paid',
      status: 'confirmed',
      stripePaymentIntentId: paymentIntent.id
    },
    include: {
      user: true,
      service: true
    }
  })
  
  // Invalidate availability cache for this date
  await redis.del(
    `availability:${booking.userId}:${booking.bookingDate}`
  )
  
  // Queue email to customer
  await queueService.publishEmail({
    to: booking.customerEmail,
    template: 'booking-confirmation',
    data: {
      customerName: booking.customerName,
      businessName: booking.user.businessName,
      serviceName: booking.service.name,
      date: booking.bookingDate,
      time: booking.bookingTime,
      depositAmount: booking.depositAmount,
      receiptUrl: paymentIntent.charges.data[0].receipt_url
    }
  })
  
  // Queue email to tradie
  await queueService.publishEmail({
    to: booking.user.email,
    template: 'new-booking-tradie',
    data: {
      businessName: booking.user.businessName,
      customerName: booking.customerName,
      serviceName: booking.service.name,
      date: booking.bookingDate,
      time: booking.bookingTime,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress
    }
  })
  
  // Queue SMS to tradie (optional)
  if (booking.user.phone) {
    await queueService.publishSMS({
      to: booking.user.phone,
      message: `New booking: ${booking.customerName} for ${booking.service.name} on ${booking.bookingDate} at ${booking.bookingTime}`
    })
  }
  
  console.log(`Payment succeeded for booking ${bookingId}`)
}
```

#### Payment Failed Handler

```javascript
// api/src/services/webhooks/handlePaymentFailed.js
async function handlePaymentFailed(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId
  
  if (!bookingId) return
  
  // Update booking status
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      depositStatus: 'failed',
      status: 'cancelled'
    }
  })
  
  // Queue email to customer with retry instructions
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true }
  })
  
  await queueService.publishEmail({
    to: booking.customerEmail,
    template: 'payment-failed',
    data: {
      customerName: booking.customerName,
      businessName: booking.user.businessName,
      reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      retryUrl: `https://peepopay.com/widget/${booking.user.slug}`
    }
  })
  
  console.log(`Payment failed for booking ${bookingId}`)
}
```

#### Account Update Handler

```javascript
// api/src/services/webhooks/handleAccountUpdate.js
async function handleAccountUpdate(account) {
  // Check if tradie completed onboarding
  const onboarded = account.charges_enabled && account.payouts_enabled
  
  // Update user in database
  await prisma.user.update({
    where: { stripeAccountId: account.id },
    data: {
      stripeOnboarded: onboarded
    }
  })
  
  console.log(`Account ${account.id} updated, onboarded: ${onboarded}`)
}
```

---

### 2. Charging Remaining Balance

```javascript
// api/src/routes/bookings.js
router.post('/:id/charge-balance', requireAuth, async (req, res) => {
  const { id } = req.params
  const { finalAmount } = req.body
  
  // Get booking
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true }
  })
  
  // Verify ownership
  if (booking.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  // Verify booking is confirmed
  if (booking.status !== 'confirmed') {
    return res.status(400).json({ 
      error: 'Cannot charge balance for non-confirmed booking' 
    })
  }
  
  // Verify deposit was paid
  if (booking.depositStatus !== 'paid') {
    return res.status(400).json({ 
      error: 'Deposit not yet paid' 
    })
  }
  
  // Calculate remaining balance
  const remainingBalance = finalAmount - booking.depositAmount
  
  if (remainingBalance <= 0) {
    return res.status(400).json({ 
      error: 'No remaining balance to charge' 
    })
  }
  
  try {
    // Create payment intent for remaining balance
    const platformFee = Math.round(remainingBalance * 0.025 * 100)
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(remainingBalance * 100),
      currency: 'nzd',
      application_fee_amount: platformFee,
      customer: booking.stripeCustomerId, // If saved
      payment_method: booking.stripePaymentMethodId, // If saved
      confirm: true, // Auto-charge if payment method saved
      metadata: {
        bookingId: booking.id,
        type: 'remaining_balance'
      },
      description: `Remaining balance for booking ${booking.id}`
    }, {
      stripeAccount: booking.user.stripeAccountId
    })
    
    // Update booking
    await prisma.booking.update({
      where: { id },
      data: {
        totalAmount: finalAmount,
        status: 'completed',
        completedAt: new Date()
      }
    })
    
    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        amountCharged: remainingBalance
      }
    })
  } catch (error) {
    console.error('Error charging balance:', error)
    
    res.status(500).json({
      error: 'Failed to charge remaining balance',
      message: error.message
    })
  }
})
```

---

### 3. Refund Handling

```javascript
// api/src/routes/bookings.js
router.post('/:id/refund', requireAuth, async (req, res) => {
  const { id } = req.params
  const { reason, amount } = req.body // Optional partial refund
  
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true }
  })
  
  // Verify ownership
  if (booking.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  // Verify payment was made
  if (!booking.stripePaymentIntentId) {
    return res.status(400).json({ error: 'No payment to refund' })
  }
  
  try {
    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Full refund if no amount
      reason: reason || 'requested_by_customer',
      metadata: {
        bookingId: booking.id
      }
    }, {
      stripeAccount: booking.user.stripeAccountId
    })
    
    // Update booking
    await prisma.booking.update({
      where: { id },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        refundAmount: refund.amount / 100
      }
    })
    
    // Notify customer
    await queueService.publishEmail({
      to: booking.customerEmail,
      template: 'refund-processed',
      data: {
        customerName: booking.customerName,
        refundAmount: refund.amount / 100,
        reason: reason
      }
    })
    
    res.json({
      success: true,
      data: { refundId: refund.id }
    })
  } catch (error) {
    console.error('Refund error:', error)
    res.status(500).json({ error: error.message })
  }
})
```

---

### 4. Stripe Error Handling

```javascript
// api/src/middleware/stripeErrorHandler.js
export function handleStripeError(error, req, res, next) {
  if (error.type === 'StripeCardError') {
    // Card declined or invalid
    return res.status(402).json({
      error: 'Payment failed',
      message: error.message,
      code: error.code,
      declineCode: error.decline_code
    })
  }
  
  if (error.type === 'StripeRateLimitError') {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    })
  }
  
  if (error.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      error: 'Invalid request',
      message: error.message
    })
  }
  
  if (error.type === 'StripeAPIError') {
    return res.status(500).json({
      error: 'Payment processing error',
      message: 'Please try again'
    })
  }
  
  if (error.type === 'StripeConnectionError') {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Payment service temporarily unavailable'
    })
  }
  
  if (error.type === 'StripeAuthenticationError') {
    console.error('Stripe authentication error:', error)
    return res.status(500).json({
      error: 'Configuration error',
      message: 'Payment system misconfigured'
    })
  }
  
  // Pass to general error handler
  next(error)
}

// Usage in Express
app.use(handleStripeError)
```

---

### 5. Testing Strategy

#### Stripe Test Mode Setup

```bash
# Use test API keys in development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Test Cards

```javascript
// api/src/utils/testCards.js
export const TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requires3DS: '4000002500003155',
  expiredCard: '4000000000000069'
}
```

#### E2E Test Flow

```javascript
// tests/booking-flow.test.js
describe('Booking Flow', () => {
  it('should complete booking with successful payment', async () => {
    // 1. Create booking
    const booking = await request(app)
      .post('/api/widget/test-tradie/book')
      .send({
        serviceId: 'svc_123',
        date: '2025-11-01',
        time: '10:00',
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+64211234567',
          address: '123 Test St'
        }
      })
    
    expect(booking.status).toBe(200)
    const { bookingId, stripeClientSecret } = booking.body.data
    
    // 2. Confirm payment (using Stripe test helpers)
    const paymentIntent = await stripe.paymentIntents.confirm(
      stripeClientSecret.split('_secret_')[0],
      {
        payment_method: 'pm_card_visa' // Stripe test payment method
      }
    )
    
    expect(paymentIntent.status).toBe('succeeded')
    
    // 3. Wait for webhook processing
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 4. Verify booking was confirmed
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })
    
    expect(updatedBooking.status).toBe('confirmed')
    expect(updatedBooking.depositStatus).toBe('paid')
  })
  
  it('should handle declined payment', async () => {
    // Similar test with declined test card
  })
})
```

---

### 6. Webhook Testing Locally

#### Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

#### Webhook Event Replay

```bash
# Get recent events
stripe events list --limit 10

# Replay specific event
stripe events resend evt_xxx
```

---

### 7. Environment Variables for Stripe

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook Secret (from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform Fee
STRIPE_PLATFORM_FEE_PERCENTAGE=2.5

# Test Mode (for development)
STRIPE_TEST_MODE=true
```

---

### 8. Stripe Connect Dashboard Access

```javascript
// api/src/routes/stripe.js
router.get('/dashboard-link', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  })
  
  if (!user.stripeAccountId) {
    return res.status(400).json({ 
      error: 'No Stripe account connected' 
    })
  }
  
  try {
    // Create login link for tradie to access their Stripe dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      user.stripeAccountId
    )
    
    res.json({
      success: true,
      data: { url: loginLink.url }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

---

### 9. Monitoring & Alerts

```javascript
// api/src/services/monitoring.js
export async function monitorStripeEvents() {
  // Track failed payments
  if (event.type === 'payment_intent.payment_failed') {
    await logMetric('stripe.payment.failed', 1, {
      reason: event.data.object.last_payment_error?.code
    })
  }
  
  // Track successful payments
  if (event.type === 'payment_intent.succeeded') {
    await logMetric('stripe.payment.succeeded', 1, {
      amount: event.data.object.amount / 100
    })
  }
  
  // Alert on high failure rate
  const failureRate = await getFailureRate('1h')
  if (failureRate > 0.1) { // >10% failure rate
    await sendAlert('High payment failure rate detected')
  }
}
```

---

### Stripe Integration Checklist

**Setup:**
- ✅ Create Stripe platform account
- ✅ Set up Stripe Connect
- ✅ Configure webhook endpoints
- ✅ Add API keys to environment
- ✅ Test webhook signature verification

**Implementation:**
- ✅ Tradie onboarding flow
- ✅ Payment intent creation (deposit)
- ✅ Webhook handling (success/failure)
- ✅ Charge remaining balance
- ✅ Refund handling
- ✅ Error handling
- ✅ Stripe dashboard access

**Testing:**
- ✅ Test with Stripe test cards
- ✅ Test webhook locally (Stripe CLI)
- ✅ E2E booking flow tests
- ✅ Test error scenarios
- ✅ Test refunds

**Production:**
- ✅ Switch to live API keys
- ✅ Configure production webhooks
- ✅ Set up monitoring/alerts
- ✅ Document payout schedule
- ✅ Prepare support docs for tradies

---

## Monitoring & Logging Setup

### 1. Structured Logging (Pino)

```bash
npm install pino pino-pretty
```

```typescript
// api/src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    }
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.parameters,
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
})

// Request logger middleware
export function requestLogger(req, res, next) {
  req.log = logger.child({ requestId: req.id })
  
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    req.log.info({
      req,
      res,
      duration,
    }, 'Request completed')
  })
  
  next()
}
```

### 2. Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
// api/src/lib/sentry.ts
import * as Sentry from "@sentry/node"
import { ProfilingIntegration } from "@sentry/profiling-node"

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    integrations: [
      new ProfilingIntegration(),
    ],
    beforeSend(event, hint) {
      // Don't send auth errors to Sentry
      if (event.exception?.values?.[0]?.type === 'UnauthorizedError') {
        return null
      }
      return event
    },
  })
}

// Express middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler()
export const sentryRequestHandler = Sentry.Handlers.requestHandler()
```

### 3. Application Metrics

```typescript
// api/src/lib/metrics.ts
import { logger } from './logger'

class MetricsCollector {
  private metrics: Map<string, number[]> = new Map()
  
  track(metric: string, value: number, tags: Record<string, string> = {}) {
    const key = `${metric}:${JSON.stringify(tags)}`
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }
    
    this.metrics.get(key)!.push(value)
    
    // Log to structured logs (can be scraped by monitoring tools)
    logger.info({
      metric,
      value,
      tags,
      timestamp: Date.now(),
    }, 'Metric tracked')
  }
  
  async flush() {
    // Flush metrics to monitoring service
    // e.g., DataDog, Prometheus, CloudWatch
    for (const [key, values] of this.metrics.entries()) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const max = Math.max(...values)
      const min = Math.min(...values)
      
      logger.info({
        metric: key,
        avg,
        max,
        min,
        count: values.length,
      }, 'Metric summary')
    }
    
    this.metrics.clear()
  }
}

export const metrics = new MetricsCollector()

// Flush metrics every minute
setInterval(() => metrics.flush(), 60000)

// Track important metrics
export function trackBookingCreated(depositAmount: number) {
  metrics.track('booking.created', 1)
  metrics.track('booking.deposit', depositAmount)
}

export function trackPaymentSuccess(amount: number) {
  metrics.track('payment.success', 1)
  metrics.track('payment.amount', amount)
}

export function trackPaymentFailed(reason: string) {
  metrics.track('payment.failed', 1, { reason })
}
```

### 4. Health Check Endpoints

```typescript
// api/src/routes/health.ts
import express from 'express'
import { checkDatabaseConnection } from '../db'
import { redis } from '../lib/redis'

const router = express.Router()

router.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    rabbitmq: false,
  }
  
  // Check database
  try {
    checks.database = await checkDatabaseConnection()
  } catch (error) {
    checks.database = false
  }
  
  // Check Redis
  try {
    await redis.ping()
    checks.redis = true
  } catch (error) {
    checks.redis = false
  }
  
  // Check RabbitMQ
  try {
    // Check connection
    checks.rabbitmq = queueService.isConnected()
  } catch (error) {
    checks.rabbitmq = false
  }
  
  const allHealthy = Object.values(checks).every(v => v === true)
  const status = allHealthy ? 200 : 503
  
  res.status(status).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  })
})

export default router
```

### 5. Alerting Rules

```yaml
# alerts.yml (for monitoring system)
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    window: 5m
    severity: critical
    notify: slack, email
    
  - name: slow_api_response
    condition: p95_latency > 2s
    window: 5m
    severity: warning
    notify: slack
    
  - name: payment_failures
    condition: payment_failure_rate > 10%
    window: 10m
    severity: critical
    notify: slack, email, sms
    
  - name: database_connection_errors
    condition: db_connection_errors > 0
    window: 1m
    severity: critical
    notify: slack, email
    
  - name: high_memory_usage
    condition: memory_usage > 85%
    window: 5m
    severity: warning
    notify: slack
```

---

## Security Audit Checklist

### Infrastructure Security

**✅ Network Security**
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] SSH key-based auth only (no password)
- [ ] Fail2ban installed (block brute force)
- [ ] UFW/iptables configured
- [ ] Private networking for internal services

**✅ SSL/TLS**
- [ ] HTTPS enforced (Traefik redirects)
- [ ] TLS 1.2+ only
- [ ] Strong cipher suites
- [ ] HSTS enabled
- [ ] Certificate auto-renewal working

**✅ Docker Security**
- [ ] Run containers as non-root
- [ ] Read-only filesystem where possible
- [ ] Security scanning enabled
- [ ] Docker socket not exposed
- [ ] Secrets managed via Docker secrets

### Application Security

**✅ Authentication**
- [ ] Better Auth properly configured
- [ ] Session tokens in httpOnly cookies
- [ ] CSRF protection enabled
- [ ] Password requirements enforced
- [ ] Email verification required
- [ ] Rate limiting on auth endpoints

**✅ Authorization**
- [ ] All routes have proper auth checks
- [ ] Resource ownership verified
- [ ] Role-based access control (if needed)
- [ ] API rate limiting per user

**✅ Input Validation**
- [ ] All inputs validated with Zod
- [ ] SQL injection prevented (Drizzle ORM)
- [ ] XSS prevention (React escaping)
- [ ] File upload validation
- [ ] Max request size limits

**✅ Data Protection**
- [ ] Database backups automated
- [ ] Encryption at rest (Supabase)
- [ ] Encryption in transit (SSL)
- [ ] Sensitive data not logged
- [ ] PII handling compliant

**✅ API Security**
- [ ] Rate limiting enabled (Traefik + Node)
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] No sensitive data in URLs
- [ ] API versioning strategy

**✅ Stripe Security**
- [ ] Webhook signature verification
- [ ] API keys in environment (not code)
- [ ] Test vs live keys separated
- [ ] Stripe Connect properly configured
- [ ] Idempotency keys used

### Monitoring & Response

**✅ Logging**
- [ ] All errors logged
- [ ] No sensitive data in logs
- [ ] Log rotation configured
- [ ] Logs shipped to central location
- [ ] Audit trail for critical actions

**✅ Monitoring**
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Alert on critical issues
- [ ] On-call rotation defined

**✅ Incident Response**
- [ ] Incident response plan documented
- [ ] Backup restoration tested
- [ ] Rollback procedure defined
- [ ] Contact list maintained
- [ ] Post-mortem process

### Compliance

**✅ Privacy**
- [ ] Privacy policy published
- [ ] Cookie consent (if EU traffic)
- [ ] Data retention policy
- [ ] Right to deletion process
- [ ] Data export capability

**✅ PCI DSS**
- [ ] No card data stored (Stripe handles)
- [ ] Stripe Connect used properly
- [ ] Payment logs don't contain PII
- [ ] SAQ A questionnaire completed

---

## Cost Optimization Guide

### Development/Staging
```
DigitalOcean Droplet (2GB)     $12/month
Supabase (Free tier)           $0
Total:                         $12/month
```

### Production - Months 1-3 (0-50 tradies)
```
DigitalOcean Droplet (4GB)     $24/month
Supabase (Free tier)           $0
Domain                         $12/year (~$1/month)
Resend (3k emails/month)       $0
Total:                         ~$25/month
```

### Production - Months 4-12 (50-200 tradies)
```
DigitalOcean Droplet (8GB)     $48/month
Supabase Pro                   $25/month
Resend (10k emails/month)      $0
CloudFlare CDN (widget)        $0
Total:                         ~$73/month
```

### Production - Year 2+ (200-1000 tradies)
```
DigitalOcean Droplets (3x 8GB) $144/month
Load Balancer                  $12/month
Supabase Pro                   $25/month
Managed Redis                  $15/month
Resend Pro                     $20/month
CDN                            $5/month
Monitoring (DataDog)           $15/month
Total:                         ~$236/month
```

### Revenue vs Costs

**Assumptions:**
- 100 tradies @ $29/month = $2,900/month
- Average: 10 bookings per tradie per month
- Platform fee: 2.5% of avg $100 deposit = $2.50 per booking
- 100 tradies × 10 bookings × $2.50 = $2,500/month from fees

**Total Revenue:** $2,900 + $2,500 = $5,400/month
**Total Costs:** ~$236/month
**Gross Margin:** ~95%

---

## Scaling Triggers & Procedures

### When to Scale

**Trigger 1: CPU/Memory > 80% for 1 hour**
→ Increase droplet size OR add replica

**Trigger 2: API latency p95 > 2 seconds**
→ Add API replicas, optimize queries

**Trigger 3: Database connections > 80% of pool**
→ Increase pool size OR add read replicas

**Trigger 4: Payment success rate < 95%**
→ Investigate Stripe issues, check error logs

**Trigger 5: Widget load time > 3 seconds**
→ Move to CDN, optimize bundle size

### Scaling Procedures

#### 1. Vertical Scaling (Increase Resources)
```bash
# Resize droplet
doctl compute droplet-action resize <droplet-id> --size s-4vcpu-8gb

# Update Terraform
terraform apply -var="droplet_size=s-4vcpu-8gb"
```

#### 2. Horizontal Scaling (Add Instances)
```yaml
# Update docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 3  # Increase from 2 to 3
      
  worker:
    deploy:
      replicas: 3  # Increase workers
```

#### 3. Database Scaling
```bash
# 1. Add read replicas (Supabase)
# 2. Use connection pooler (PgBouncer)
# 3. Optimize slow queries
npm run db:studio  # Analyze query performance
```

#### 4. Cache Optimization
```typescript
// Increase cache TTLs for stable data
await redis.set(
  `tradie:${slug}:services`,
  JSON.stringify(services),
  'EX',
  3600  // 1 hour instead of 5 minutes
)
```

---

## Deployment Automation

### Pre-Deploy Checklist
- [ ] All tests passing
- [ ] Database migrations generated
- [ ] Environment variables updated
- [ ] Secrets rotated (if needed)
- [ ] Backup taken
- [ ] Monitoring alerts tested

### Deploy Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# 1. Run tests
echo "⏳ Running tests..."
npm run test

# 2. Build Docker images
echo "⏳ Building images..."
docker buildx build --platform linux/amd64 -t peepopay-api:latest ./api
docker buildx build --platform linux/amd64 -t peepopay-dashboard:latest ./dashboard

# 3. Push to registry
echo "⏳ Pushing to registry..."
docker push $DOCKER_REGISTRY/peepopay-api:latest
docker push $DOCKER_REGISTRY/peepopay-dashboard:latest

# 4. SSH to production
echo "⏳ Deploying to production..."
ssh production <<'ENDSSH'
  cd /opt/peepopay
  
  # Pull latest images
  docker pull $DOCKER_REGISTRY/peepopay-api:latest
  docker pull $DOCKER_REGISTRY/peepopay-dashboard:latest
  
  # Run migrations
  docker exec peepopay_api npm run db:migrate
  
  # Update stack
  docker stack deploy -c docker-compose.prod.yml peepopay
  
  # Wait for services to be healthy
  sleep 30
  
  # Health check
  curl -f http://localhost/health || exit 1
ENDSSH

echo "✅ Deployment completed successfully!"
```

### Rollback Procedure

```bash
#!/bin/bash
# scripts/rollback.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

ssh production <<ENDSSH
  cd /opt/peepopay
  
  # Pull previous version
  docker pull $DOCKER_REGISTRY/peepopay-api:$VERSION
  docker pull $DOCKER_REGISTRY/peepopay-dashboard:$VERSION
  
  # Tag as latest
  docker tag $DOCKER_REGISTRY/peepopay-api:$VERSION peepopay-api:latest
  docker tag $DOCKER_REGISTRY/peepopay-dashboard:$VERSION peepopay-dashboard:latest
  
  # Redeploy
  docker stack deploy -c docker-compose.prod.yml peepopay
  
  echo "✅ Rolled back to version $VERSION"
ENDSSH
```

---

## Final Production Checklist

### Pre-Launch
- [ ] Domain DNS configured
- [ ] SSL certificates working
- [ ] All environment variables set
- [ ] Database seeded (if needed)
- [ ] Stripe webhooks configured
- [ ] Email templates tested
- [ ] SMS notifications tested (optional)
- [ ] Widget tested on multiple sites
- [ ] Mobile responsiveness verified
- [ ] Payment flow tested end-to-end
- [ ] Error handling tested
- [ ] Load testing completed

### Security
- [ ] Security audit completed
- [ ] Firewall configured
- [ ] SSH hardened
- [ ] Secrets encrypted
- [ ] Backups automated
- [ ] Monitoring configured
- [ ] Alerts tested

### Legal & Compliance
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie consent (if needed)
- [ ] Stripe agreement signed
- [ ] PCI DSS compliance verified
- [ ] Support email configured

### Operations
- [ ] Documentation complete
- [ ] Runbooks written
- [ ] On-call rotation defined
- [ ] Incident response plan
- [ ] Support ticket system
- [ ] Customer onboarding flow
- [ ] Tradie support docs

---

## You're Ready to Ship! 🚀

This document covers everything you need to build and deploy PeepoPay:

✅ **Architecture** - Traefik, Docker Swarm, microservices
✅ **Database** - Drizzle ORM with migrations
✅ **Auth** - Better Auth with Google OAuth
✅ **Payments** - Complete Stripe Connect integration
✅ **Widget** - Embeddable booking widget
✅ **API** - RESTful API with all endpoints
✅ **Security** - Comprehensive security checklist
✅ **Monitoring** - Logging, metrics, alerts
✅ **Scaling** - Triggers and procedures
✅ **Deployment** - Automated CI/CD

**Next steps:**
1. Set up development environment
2. Run initial Terraform provisioning
3. Deploy services to production
4. Start beta customer acquisition
5. Iterate based on feedback

Good luck! 🎉
