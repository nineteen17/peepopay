# Production Deployment Guide

This guide covers deploying PeepoPay to production using Docker Swarm.

## Architecture Overview

PeepoPay production deployment uses:
- **Docker Swarm**: Container orchestration for high availability and scaling
- **Traefik**: Reverse proxy with automatic SSL/TLS (Let's Encrypt)
- **External Managed Database**: Supabase PostgreSQL (recommended) or AWS RDS
- **Redis & RabbitMQ**: Running in Docker with persistent volumes
- **Multiple Replicas**: 2x API, 2x Worker, 2x Dashboard, 2x Widget

## Prerequisites

1. **Docker Swarm** initialized:
   ```bash
   docker swarm init
   ```

2. **External PostgreSQL Database** (Supabase/AWS RDS/DigitalOcean):
   - Create a production database
   - Note the connection string (format: `postgresql://user:password@host:5432/database?sslmode=require`)
   - Enable SSL mode for security

3. **Domain Names** configured:
   - `peepopay.com` → Dashboard
   - `api.peepopay.com` → API
   - `widget.peepopay.com` → Widget
   - `traefik.peepopay.com` → Traefik dashboard (optional)

## Setup Docker Secrets

Docker Swarm uses secrets to securely manage sensitive credentials. Create all required secrets before deployment:

### Database Connection String
```bash
# Replace with your actual Supabase/RDS connection string
echo "postgresql://user:password@your-db.supabase.co:5432/postgres?sslmode=require" | \
  docker secret create database_url -
```

### RabbitMQ Password
```bash
echo "your-strong-rabbitmq-password" | docker secret create rabbitmq_password -
```

### Stripe Keys
```bash
echo "sk_live_your_stripe_secret_key" | docker secret create stripe_secret_key -
echo "whsec_your_stripe_webhook_secret" | docker secret create stripe_webhook_secret -
```

### Better Auth Secret
```bash
# Generate a random secret (minimum 32 characters)
openssl rand -base64 32 | docker secret create better_auth_secret -
```

### SMTP Password (for email sending)
```bash
echo "your-resend-api-key" | docker secret create smtp_password -
```

### Verify Secrets Created
```bash
docker secret ls
```

You should see:
- `database_url`
- `rabbitmq_password`
- `stripe_secret_key`
- `stripe_webhook_secret`
- `better_auth_secret`
- `smtp_password`

## Build and Push Docker Images

If using a container registry (Docker Hub, AWS ECR, etc.):

```bash
# Set your registry
export DOCKER_REGISTRY=your-registry.com/
export VERSION=1.0.0

# Build and push API image
cd packages/api
docker build -t ${DOCKER_REGISTRY}peepopay-api:${VERSION} .
docker push ${DOCKER_REGISTRY}peepopay-api:${VERSION}

# Build and push Dashboard image
cd ../dashboard
docker build -t ${DOCKER_REGISTRY}peepopay-dashboard:${VERSION} .
docker push ${DOCKER_REGISTRY}peepopay-dashboard:${VERSION}

# Build and push Widget image
cd ../widget
docker build -t ${DOCKER_REGISTRY}peepopay-widget:${VERSION} .
docker push ${DOCKER_REGISTRY}peepopay-widget:${VERSION}
```

If deploying locally (single-node Swarm), you can skip the push step.

## Deploy the Stack

```bash
# Set environment variables
export DOCKER_REGISTRY=your-registry.com/  # Leave empty if building locally
export VERSION=1.0.0
export LETSENCRYPT_EMAIL=admin@peepopay.com

# Deploy the stack
docker stack deploy -c docker-stack.yml peepopay
```

## Verify Deployment

### Check Stack Status
```bash
docker stack ps peepopay
```

All services should show `Running` state.

### Check Service Logs
```bash
# API logs
docker service logs peepopay_api -f

# Worker logs
docker service logs peepopay_worker -f

# Database connection errors?
docker service logs peepopay_api --tail 50 | grep -i database
```

### Check Health
```bash
# List all services with replica counts
docker stack services peepopay
```

Expected output:
```
NAME                 MODE         REPLICAS   IMAGE
peepopay_api         replicated   2/2        peepopay-api:1.0.0
peepopay_dashboard   replicated   2/2        peepopay-dashboard:1.0.0
peepopay_rabbitmq    replicated   1/1        rabbitmq:3-management-alpine
peepopay_redis       replicated   1/1        redis:7-alpine
peepopay_traefik     replicated   1/1        traefik:v2.10
peepopay_widget      replicated   2/2        peepopay-widget:1.0.0
peepopay_worker      replicated   2/2        peepopay-api:1.0.0
```

### Test API Health Endpoint
```bash
curl https://api.peepopay.com/health
```

Should return: `{"status":"ok"}`

## Database Migrations

Run migrations before first deployment or after schema changes:

```bash
# SSH into manager node or run locally with production DATABASE_URL
export DATABASE_URL="postgresql://user:password@your-db.supabase.co:5432/postgres?sslmode=require"

# Run migrations
npm run db:push
```

## Updating the Stack

### Rolling Update (Zero Downtime)
```bash
# Update API service with new image
docker service update \
  --image ${DOCKER_REGISTRY}peepopay-api:1.1.0 \
  peepopay_api

# Update happens one replica at a time (configured in docker-stack.yml)
```

### Full Stack Update
```bash
# Update docker-stack.yml with new VERSION
export VERSION=1.1.0

# Redeploy (only changes are updated)
docker stack deploy -c docker-stack.yml peepopay
```

## Scaling Services

```bash
# Scale API to 4 replicas
docker service scale peepopay_api=4

# Scale Worker to 3 replicas
docker service scale peepopay_worker=3
```

## Monitoring

### View Service Logs
```bash
docker service logs -f peepopay_api
docker service logs -f peepopay_worker
docker service logs -f peepopay_rabbitmq
```

### RabbitMQ Management UI
Access at: `http://your-server-ip:15672`
- Username: `admin`
- Password: (value in `rabbitmq_password` secret)

### Traefik Dashboard
Access at: `https://traefik.peepopay.com`

## Backup and Recovery

### Database Backups
Since we're using a managed database (Supabase/RDS):
- Supabase: Automatic daily backups included
- AWS RDS: Configure automated backups in RDS settings
- Manual backup: Use `pg_dump` from your managed database

### Volume Backups (Redis, RabbitMQ)
```bash
# Backup Redis data
docker run --rm \
  -v peepopay_redis_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-backup-$(date +%Y%m%d).tar.gz /data

# Backup RabbitMQ data
docker run --rm \
  -v peepopay_rabbitmq_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/rabbitmq-backup-$(date +%Y%m%d).tar.gz /data
```

## Troubleshooting

### Service Won't Start
```bash
# Check service logs
docker service logs peepopay_api --tail 100

# Check service inspect
docker service inspect peepopay_api
```

### Database Connection Issues
```bash
# Verify DATABASE_URL secret is correct
docker secret inspect database_url

# Test connection from API container
docker exec -it $(docker ps -q -f name=peepopay_api) sh
apk add postgresql-client
psql $DATABASE_URL
```

### Secret Not Found Error
```bash
# List all secrets
docker secret ls

# Recreate missing secret
echo "new-value" | docker secret create secret_name -
```

### SSL Certificate Issues
```bash
# Check Traefik logs
docker service logs peepopay_traefik -f

# Verify DNS points to your server
dig api.peepopay.com
```

## Security Checklist

- [ ] All secrets created using `docker secret create`
- [ ] Database uses SSL/TLS connection (`sslmode=require`)
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Let's Encrypt SSL certificates enabled
- [ ] RabbitMQ management UI not exposed publicly (or secured)
- [ ] Traefik dashboard secured with authentication
- [ ] Regular backups configured
- [ ] Monitoring/alerting configured

## Production Environment Variables

The following secrets are read from Docker secrets in production:

| Environment Variable | Secret File | Purpose |
|---------------------|-------------|---------|
| `DATABASE_URL` | `/run/secrets/database_url` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | `/run/secrets/stripe_secret_key` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | `/run/secrets/stripe_webhook_secret` | Stripe webhook validation |
| `BETTER_AUTH_SECRET` | `/run/secrets/better_auth_secret` | Better Auth encryption key |
| `RESEND_API_KEY` | `/run/secrets/smtp_password` | Email sending API key |

The config system automatically detects `*_FILE` environment variables and reads values from the specified files.

## Differences from Local Development

| Aspect | Local Development | Production |
|--------|------------------|------------|
| Database | PostgreSQL in Docker | External managed DB (Supabase/RDS) |
| Replicas | 1 per service | 2+ per service |
| SSL/TLS | None | Automatic (Let's Encrypt) |
| Secrets | `.env` file | Docker secrets |
| Hot Reload | Yes | No |
| Volumes | Named volumes | Named volumes + external DB |

## Next Steps

1. Set up monitoring (Prometheus, Grafana, Sentry)
2. Configure log aggregation (ELK stack, Datadog)
3. Set up CI/CD pipeline (GitHub Actions)
4. Configure database backups and disaster recovery
5. Load testing and performance optimization
