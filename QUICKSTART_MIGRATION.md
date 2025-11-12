# 🚀 Quick Migration Guide

## Run the Implementation Plan Migration NOW

### For Docker Compose (Development)

```bash
# Option 1: Using the dedicated migrate service (Recommended)
docker-compose run --rm migrate

# Option 2: If containers are already running
docker-compose exec api npm run db:migrate

# Option 3: Manual SQL execution
docker cp packages/api/drizzle/0001_implementation_plan_fixes.sql peepopay-postgres:/tmp/
docker exec -i peepopay-postgres psql -U postgres -d peepopay -f /tmp/0001_implementation_plan_fixes.sql
```

### For Docker Swarm (Production)

```bash
# 1. Build and push the updated image
docker build -t peepopay-api:latest packages/api/
docker tag peepopay-api:latest your-registry/peepopay-api:latest
docker push your-registry/peepopay-api:latest

# 2. Run migration as one-off service
docker service create \
  --name peepopay-migrate \
  --network peepopay-network \
  --env DATABASE_URL="postgresql://postgres:postgres@postgres:5432/peepopay" \
  --restart-condition none \
  peepopay-api:latest \
  npm run db:migrate

# 3. Watch migration logs
docker service logs -f peepopay-migrate

# 4. Clean up after success
docker service rm peepopay-migrate

# 5. Update your stack
docker stack deploy -c docker-compose.swarm.yml peepopay
```

---

## Verify Migration Success

```bash
# Check new columns in bookings table
docker exec peepopay-postgres psql -U postgres -d peepopay -c "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'bookings'
  AND column_name IN ('deposit_status', 'customer_address');
"

# Check new column in services table
docker exec peepopay-postgres psql -U postgres -d peepopay -c "
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'services'
  AND column_name = 'deposit_type';
"

# List all new indexes
docker exec peepopay-postgres psql -U postgres -d peepopay -c "
  SELECT indexname, tablename
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  ORDER BY tablename, indexname;
"
```

Expected output should show:
- ✅ `bookings.deposit_status` (text, not null)
- ✅ `bookings.customer_address` (text, nullable)
- ✅ `services.deposit_type` (text, not null, default 'fixed')
- ✅ Multiple indexes starting with `idx_`

---

## Troubleshooting

### "drizzle-kit not found" error

This is expected in the Docker container. Use `npm run db:migrate` instead:

```bash
docker-compose run --rm migrate
```

### "Cannot connect to database"

Check if postgres is running and healthy:

```bash
docker-compose ps postgres
docker-compose logs postgres
```

Start postgres if needed:

```bash
docker-compose up -d postgres
```

### Migration already applied

The migration SQL uses `IF NOT EXISTS` checks, so it's safe to run multiple times:

```bash
# This is safe to run again
docker-compose run --rm migrate
```

---

## What This Migration Does

✅ **Adds `depositType` to services** (percentage/fixed)
✅ **Adds `depositStatus` to bookings** (pending/paid/failed/refunded)
✅ **Makes `customerPhone` required**
✅ **Adds optional `customerAddress` field**
✅ **Creates 8 performance indexes**
✅ **Updates existing booking deposit statuses**

See `packages/api/drizzle/0001_implementation_plan_fixes.sql` for full details.

---

## After Migration

1. **Restart your services** to use the new schema:
   ```bash
   # Docker Compose
   docker-compose down && docker-compose up -d

   # Docker Swarm
   docker stack deploy -c docker-compose.swarm.yml peepopay
   ```

2. **Install missing dependencies** (when NPM registry is accessible):
   ```bash
   cd packages/api
   npm install express-rate-limit validator date-fns-tz
   npm install --save-dev @types/validator
   ```

3. **Test the new availability system**:
   ```bash
   # Create availability rule
   curl -X POST http://localhost:4000/api/availability \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "dayOfWeek": "monday",
       "startTime": "09:00",
       "endTime": "17:00"
     }'

   # Get available slots
   curl "http://localhost:4000/api/availability/your-slug?date=2025-11-15&duration=60"
   ```

---

## Need Help?

See detailed documentation:
- **Full Docker migration guide**: `MIGRATIONS_DOCKER.md`
- **Implementation plan**: `IMPLEMENTATION_PLAN.md`
- **Latest commit**: Check git log for implementation details
