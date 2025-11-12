# Database Migration Guide for Docker Environments

## Overview

This guide covers running database migrations in containerized environments (Docker Compose for development and Docker Swarm for production).

## Quick Start

### Docker Compose (Development)

```bash
# Run migrations using the migrate service
docker-compose run --rm migrate

# Or run directly in the API container
docker-compose exec api npm run db:migrate

# Or using the dedicated migration container
docker-compose up migrate
```

### Docker Swarm (Production)

```bash
# Run migration as a one-off task
docker service create --name peepopay-migrate \
  --network peepopay-network \
  --env-file .env \
  --restart-condition none \
  peepopay-api:latest \
  npm run db:migrate

# Check migration logs
docker service logs peepopay-migrate

# Clean up after migration completes
docker service rm peepopay-migrate
```

---

## Docker Compose Setup

### Option 1: Dedicated Migration Service (Recommended)

Add this service to your `docker-compose.yml`:

```yaml
# Database Migration Service (run once)
migrate:
  build:
    context: ./packages/api
    dockerfile: Dockerfile
  container_name: peepopay-migrate
  env_file:
    - .env
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/peepopay
  command: ["npm", "run", "db:migrate"]
  depends_on:
    postgres:
      condition: service_healthy
  networks:
    - peepopay
  profiles:
    - tools  # Only runs when explicitly called
```

**Usage:**
```bash
# Run migrations
docker-compose run --rm migrate

# Or with the tools profile
docker-compose --profile tools up migrate
```

### Option 2: Init Container Pattern

Modify the `api` service to run migrations on startup:

```yaml
api:
  # ... existing config ...
  entrypoint: ["/app/entrypoint.sh"]
```

Then create an entrypoint script (see below).

### Option 3: Manual Execution

Run migrations inside the running API container:

```bash
# If API container is already running
docker-compose exec api npm run db:migrate

# Or start a one-off container
docker-compose run --rm api npm run db:migrate
```

---

## Docker Swarm Setup

### Option 1: Pre-Deployment Migration Task

Run migrations before deploying the stack:

```bash
# 1. Run migration as a one-off service
docker service create \
  --name peepopay-migrate \
  --network peepopay-network \
  --env DATABASE_URL="postgresql://postgres:postgres@postgres:5432/peepopay" \
  --env REDIS_URL="redis://redis:6379" \
  --env RABBITMQ_URL="amqp://admin:admin123@rabbitmq:5672" \
  --restart-condition none \
  --constraint 'node.role==manager' \
  peepopay-api:latest \
  npm run db:migrate

# 2. Wait for migration to complete
docker service logs -f peepopay-migrate

# 3. Check exit code
docker service ps peepopay-migrate --format "{{.Error}}"

# 4. Clean up
docker service rm peepopay-migrate

# 5. Deploy/update the stack
docker stack deploy -c docker-compose.swarm.yml peepopay
```

### Option 2: Init Container in Stack

Add a migration service to your `docker-compose.swarm.yml`:

```yaml
services:
  migrate:
    image: peepopay-api:${VERSION:-latest}
    networks:
      - peepopay
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
    command: npm run db:migrate
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3
      placement:
        constraints:
          - node.role == manager
```

### Option 3: Automated CI/CD Migration

Run migrations in your deployment pipeline:

```bash
# In your CI/CD script (GitHub Actions, GitLab CI, etc.)
docker run --rm \
  --network host \
  -e DATABASE_URL="$DATABASE_URL" \
  peepopay-api:$VERSION \
  npm run db:migrate
```

---

## Docker Entrypoint Script (Optional)

Create `packages/api/entrypoint.sh` for automatic migrations on startup:

```bash
#!/bin/sh
set -e

echo "🚀 Starting API container..."

# Run migrations before starting the server
echo "⏳ Running database migrations..."
npm run db:migrate

echo "✅ Migrations completed!"

# Start the application
echo "🌐 Starting API server..."
exec "$@"
```

Update Dockerfile:
```dockerfile
# Add entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]
```

**⚠️ Warning:** This approach means migrations run on every container restart, which may not be ideal in production with multiple replicas.

---

## Manual SQL Migration (Fallback)

If the automated migration fails, you can run the SQL directly:

```bash
# Copy SQL file into postgres container
docker cp packages/api/drizzle/0001_implementation_plan_fixes.sql \
  peepopay-postgres:/tmp/migration.sql

# Execute SQL
docker exec -i peepopay-postgres psql -U postgres -d peepopay < \
  packages/api/drizzle/0001_implementation_plan_fixes.sql

# Or interactively
docker exec -it peepopay-postgres psql -U postgres -d peepopay
\i /tmp/migration.sql
```

---

## Migration Verification

After running migrations, verify they applied successfully:

```bash
# Check tables exist
docker exec peepopay-postgres psql -U postgres -d peepopay -c "\dt"

# Check new columns
docker exec peepopay-postgres psql -U postgres -d peepopay -c "\d bookings"
docker exec peepopay-postgres psql -U postgres -d peepopay -c "\d services"

# Check indexes
docker exec peepopay-postgres psql -U postgres -d peepopay -c "\di"
```

---

## Rollback Strategy

If a migration fails:

```bash
# 1. Check migration logs
docker service logs peepopay-migrate

# 2. Connect to database
docker exec -it peepopay-postgres psql -U postgres -d peepopay

# 3. Manually revert changes (example)
ALTER TABLE bookings DROP COLUMN IF EXISTS deposit_status;
ALTER TABLE services DROP COLUMN IF EXISTS deposit_type;
DROP INDEX IF EXISTS idx_availability_user_day;
-- ... etc

# 4. Or restore from backup
docker exec peepopay-postgres pg_restore -U postgres -d peepopay /backup/before_migration.dump
```

---

## Best Practices

### Development (Docker Compose)
1. **Use the dedicated migrate service** with `--rm` flag
2. **Run migrations before starting other services**
3. **Keep migration scripts in version control**
4. **Test migrations locally before production**

### Production (Docker Swarm)
1. **Always backup database before migrations**
2. **Run migrations before deploying new code**
3. **Use single replica with `restart-condition: none`**
4. **Monitor migration logs in real-time**
5. **Have a rollback plan ready**
6. **Test migrations in staging first**

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  run: |
    docker run --rm \
      --network host \
      -e DATABASE_URL="${{ secrets.DATABASE_URL }}" \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
      npm run db:migrate

- name: Deploy to Swarm
  run: |
    docker stack deploy -c docker-compose.swarm.yml peepopay
```

---

## Current Migration

To apply the implementation plan migration (0001_implementation_plan_fixes.sql):

```bash
# Docker Compose
docker-compose run --rm migrate

# Docker Swarm
docker service create --name peepopay-migrate \
  --network peepopay-network \
  --env DATABASE_URL="$DATABASE_URL" \
  --restart-condition none \
  peepopay-api:latest \
  npm run db:migrate

# Verify
docker exec peepopay-postgres psql -U postgres -d peepopay -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'bookings'
  AND column_name IN ('deposit_status', 'customer_address');
"
```

---

## Troubleshooting

### Migration hangs or fails

```bash
# Check database connectivity
docker exec api nc -zv postgres 5432

# Check migration logs
docker logs peepopay-api 2>&1 | grep -i migration

# Run migration with verbose logging
docker-compose run --rm api sh -c "DATABASE_URL=$DATABASE_URL npm run db:migrate"
```

### Permission errors

```bash
# Ensure database user has permissions
docker exec peepopay-postgres psql -U postgres -c "
  GRANT ALL PRIVILEGES ON DATABASE peepopay TO postgres;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
"
```

### Multiple replicas running migrations

Use deployment constraints:
```yaml
deploy:
  replicas: 1
  placement:
    constraints:
      - node.role == manager
```
