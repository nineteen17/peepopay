# Docker Compose Commands Reference

## Overview
PeepoPay has two Docker Compose setups:
- **`docker-compose.yml`** - Production-like build (compiled code, optimized)
- **`docker-compose.dev.yml`** - Development mode (hot-reload, volume mounts)

## Common Commands

### Development Mode (Recommended for local work)

```bash
# Start all services in development mode with hot-reload
docker-compose -f docker-compose.dev.yml up

# Start in detached mode (background)
docker-compose -f docker-compose.dev.yml up -d

# Build and start (rebuild images)
docker-compose -f docker-compose.dev.yml up --build

# Build and start in detached mode
docker-compose -f docker-compose.dev.yml up -d --build

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose -f docker-compose.dev.yml down -v

# View logs (all services)
docker-compose -f docker-compose.dev.yml logs

# View logs (specific service)
docker-compose -f docker-compose.dev.yml logs api
docker-compose -f docker-compose.dev.yml logs dashboard
docker-compose -f docker-compose.dev.yml logs worker

# Follow logs in real-time
docker-compose -f docker-compose.dev.yml logs -f

# Follow logs for specific service
docker-compose -f docker-compose.dev.yml logs -f api

# Restart a specific service
docker-compose -f docker-compose.dev.yml restart api

# Rebuild a specific service
docker-compose -f docker-compose.dev.yml build api
docker-compose -f docker-compose.dev.yml up -d api

# Execute command in running container
docker-compose -f docker-compose.dev.yml exec api sh
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d peepopay

# View running containers
docker-compose -f docker-compose.dev.yml ps

# Stop specific service
docker-compose -f docker-compose.dev.yml stop api

# Start specific service
docker-compose -f docker-compose.dev.yml start api
```

### Production Mode

```bash
# Start all services in production mode
docker-compose up

# Start in detached mode
docker-compose up -d

# Build and start
docker-compose up --build

# Build and start in detached mode
docker-compose up -d --build

# Stop all services
docker-compose down

# View logs
docker-compose logs
docker-compose logs -f

# View logs for specific service
docker-compose logs api
docker-compose logs -f dashboard
```

## Service-Specific Commands

### API Service

```bash
# Rebuild API without cache (forces fresh build)
docker-compose build --no-cache api
docker-compose up -d api

# View API logs
docker-compose -f docker-compose.dev.yml logs -f api

# Access API container shell
docker-compose -f docker-compose.dev.yml exec api sh

# Check environment variables in API
docker-compose -f docker-compose.dev.yml exec api printenv

# Restart API after code changes (if hot-reload doesn't pick up)
docker-compose -f docker-compose.dev.yml restart api
```

### Database (PostgreSQL)

```bash
# Access database shell
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d peepopay

# View database logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# Backup database
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres peepopay > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d peepopay
```

### Redis

```bash
# Access Redis CLI
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# View Redis logs
docker-compose -f docker-compose.dev.yml logs -f redis

# Clear Redis cache
docker-compose -f docker-compose.dev.yml exec redis redis-cli FLUSHALL
```

### RabbitMQ

```bash
# View RabbitMQ logs
docker-compose -f docker-compose.dev.yml logs -f rabbitmq

# Access RabbitMQ Management UI
# http://localhost:15672
# Username: admin
# Password: admin123 (or value from RABBITMQ_PASSWORD in .env)
```

## Troubleshooting

### Container keeps restarting

```bash
# Check logs for errors
docker-compose -f docker-compose.dev.yml logs api

# Check container status
docker-compose -f docker-compose.dev.yml ps

# Force recreate container
docker-compose -f docker-compose.dev.yml up -d --force-recreate api
```

### Code changes not reflecting

```bash
# For dev mode (should auto-reload, but if not):
docker-compose -f docker-compose.dev.yml restart api

# For production mode:
docker-compose build api
docker-compose up -d api
```

### Port already in use

```bash
# Find what's using the port
lsof -i :4000
lsof -i :3000
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or stop all Docker containers
docker-compose down
docker-compose -f docker-compose.dev.yml down
```

### Clean slate (nuclear option)

```bash
# Stop everything
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Remove all containers, networks, and volumes
docker-compose down -v
docker-compose -f docker-compose.dev.yml down -v

# Prune Docker system (removes unused images, containers, networks)
docker system prune -af
docker volume prune -f

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml up --build
```

### Check disk usage

```bash
# See Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Database Migrations

```bash
# Generate new migration
docker-compose -f docker-compose.dev.yml exec api npm run db:generate

# Run migrations
docker-compose -f docker-compose.dev.yml exec api npm run db:migrate

# Push schema to database (dev only)
docker-compose -f docker-compose.dev.yml exec api npm run db:push

# Open Drizzle Studio
docker-compose -f docker-compose.dev.yml exec api npm run db:studio
```

## Environment Variables

```bash
# View environment variables in container
docker-compose -f docker-compose.dev.yml exec api printenv

# Check specific environment variable
docker-compose -f docker-compose.dev.yml exec api printenv BETTER_AUTH_URL

# Reload environment variables (requires container restart)
docker-compose -f docker-compose.dev.yml restart api
```

## Networks

```bash
# List networks
docker network ls

# Inspect network
docker network inspect peepopay-dev-network
docker network inspect peepopay-network

# Remove network (if stuck)
docker network rm peepopay-dev-network
```

## Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect peepopay_postgres_data

# Remove specific volume (⚠️ deletes data)
docker volume rm peepopay_postgres_data

# Backup volume
docker run --rm -v peepopay_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v peepopay_postgres_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/postgres-backup.tar.gz"
```

## Quick Reference

| Task | Development | Production |
|------|------------|------------|
| Start services | `docker-compose -f docker-compose.dev.yml up` | `docker-compose up` |
| Start in background | `docker-compose -f docker-compose.dev.yml up -d` | `docker-compose up -d` |
| View logs | `docker-compose -f docker-compose.dev.yml logs -f` | `docker-compose logs -f` |
| Stop services | `docker-compose -f docker-compose.dev.yml down` | `docker-compose down` |
| Rebuild | `docker-compose -f docker-compose.dev.yml up --build` | `docker-compose up --build` |
| Restart service | `docker-compose -f docker-compose.dev.yml restart api` | `docker-compose restart api` |

## Service Ports

- **API**: 4000
- **Dashboard**: 3000
- **Widget**: 5173 (dev) / 8080 (prod)
- **PostgreSQL**: 5432
- **Redis**: 6379
- **RabbitMQ**: 5672 (AMQP), 15672 (Management UI)
- **Traefik**: 80 (HTTP), 443 (HTTPS), 8081 (Dashboard)

## Health Checks

```bash
# Check if services are healthy
docker-compose -f docker-compose.dev.yml ps

# Check API health endpoint
curl http://localhost:4000/health

# Check database connection
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres

# Check Redis connection
docker-compose -f docker-compose.dev.yml exec redis redis-cli ping
```
