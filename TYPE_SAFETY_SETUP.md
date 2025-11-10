# Type Safety Setup Guide

Complete guide for automatic type safety across API, Dashboard, and Widget.

## 🎯 Overview

This setup provides **compile-time type safety** across all packages without monorepo dependencies. Types are **automatically generated and synced** whenever you build or start the API server.

## 📦 Architecture

```
┌─────────────────────────────────────────────┐
│ API (Source of Truth)                       │
│                                             │
│  Zod Schemas (DB Schema)                    │
│         ↓                                   │
│  OpenAPI Generator                          │
│         ↓                                   │
│  openapi.json                               │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴────────┐
          ↓                 ↓
  ┌───────────────┐   ┌──────────────┐
  │  Dashboard    │   │   Widget     │
  │               │   │              │
  │ api.ts (auto) │   │ api.ts (auto)│
  └───────────────┘   └──────────────┘
```

## 🚀 Installation

### 1. Install Dependencies

```bash
# API package dependencies (where the magic happens)
cd packages/api
npm install @asteasolutions/zod-to-openapi@^7.0.0 swagger-ui-express@^5.0.0
npm install -D @types/swagger-ui-express@^4.1.6 openapi-typescript@^6.7.3
```

**Note:** If npm registry is blocked, you can install these later. All implementation files are already created.

### 2. Verify Installation

```bash
# From API directory
cd packages/api

# Check if tsx is available
npx tsx --version

# Check if openapi-typescript is available
npx openapi-typescript --version
```

## 🔄 Usage

### Automatic Type Sync

Types sync **automatically** when you start or build the API:

```bash
# From API directory
cd packages/api

# Development mode (syncs types on start)
npm run dev

# Production build (syncs types before compilation)
npm run build
```

**What happens automatically:**
1. ✅ Generate OpenAPI spec from Zod schemas → `openapi.json`
2. ✅ Generate TypeScript types from OpenAPI → `.generated/api-types.ts`
3. ✅ Copy types to Dashboard → `packages/dashboard/src/types/api.ts`
4. ✅ Copy types to Widget → `packages/widget/src/types/api.ts`
5. ✅ Create checksums for validation

### Manual Type Sync (Optional)

If you need to sync types without starting the server:

```bash
# From API directory
cd packages/api
npm run sync-types
```

## 📝 Development Workflow

### 1. Update API Schema

```bash
# Edit a schema
vim packages/api/src/db/schema/services.ts

# Add a new field
export const services = pgTable('services', {
  // ... existing fields
  category: text('category'),  // NEW FIELD
});
```

### 2. Start API (Types Sync Automatically)

```bash
# From API directory
cd packages/api
npm run dev

# 🔄 Types automatically sync to Dashboard and Widget!
```

### 3. Pull Updated Types (Dashboard/Widget Developers)

```bash
# In your frontend workspace
git pull

# TypeScript immediately sees the new types
```

### 4. Use in Widget

```typescript
// packages/widget/src/components/BookingWidget.tsx
import type { Service } from '../types/api';

// ✅ TypeScript now knows about the new 'category' field
const [services, setServices] = useState<Service[]>([]);

// ✅ Autocomplete works
service.category  // TypeScript knows this exists!
```

### 4. Use in Dashboard

```typescript
// packages/dashboard/src/app/dashboard/services/page.tsx
import type { Service, NewService } from '@/types/api';

// ✅ Type-safe service creation
const createService = async (data: NewService) => {
  // TypeScript enforces correct fields
};
```

## 🎨 Generated Type Features

### Helper Types

```typescript
// Extract response types
type ServiceResponse = ApiResponse<'/api/services/{id}', 'get'>;
// { service: Service }

// Extract request body types
type CreateBookingRequest = ApiRequestBody<'/api/bookings', 'post'>;
// NewBooking

// Extract path parameters
type ServiceParams = ApiParams<'/api/services/{id}', 'get'>;
// { id: string }

// Extract query parameters
type BookingQuery = ApiQuery<'/api/bookings', 'get'>;
// { status?: string; from?: string; to?: string }
```

### Convenience Types

```typescript
// Auto-exported from schemas
import type {
  Service,
  NewService,
  Booking,
  NewBooking,
  User,
  HealthResponse,
} from './types/api';

// Use directly
const service: Service = await fetchService();
```

## 📊 API Documentation (Swagger UI)

### Access Swagger UI

```bash
# Start API server
npm run dev:api

# Open browser
http://localhost:4000/api-docs
```

### Features

- **Interactive API testing** - Try API calls directly from browser
- **Request/Response schemas** - See exact data structures
- **Authentication testing** - Test with Bearer tokens
- **Auto-generated from Zod** - Always up-to-date

## 🔧 Integration with Build Process

### API Build

```json
// packages/api/package.json
{
  "scripts": {
    "build": "npm run generate:openapi && tsc"
  }
}
```

OpenAPI spec is generated before TypeScript compilation.

### Pre-commit Hook (Recommended)

**Note:** Pre-commit validation is not needed with auto-sync since types are always regenerated when the API runs. Optionally, you could add a CI check to ensure Dashboard/Widget developers have pulled the latest types.

## 📁 Generated Files

### Location

```
packages/api/
├── openapi.json          # OpenAPI 3.0 specification
└── .generated/
    ├── api-types.ts      # Master generated types
    └── checksum.json     # Validation checksum

packages/dashboard/src/types/
└── api.ts                # Auto-synced types (DO NOT EDIT)

packages/widget/src/types/
└── api.ts                # Auto-synced types (DO NOT EDIT)
```

### File Headers

Generated files include warnings:

```typescript
/**
 * 🚨 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Source: packages/api/openapi.json
 * Generated: 2025-11-10T12:00:00.000Z
 *
 * Types automatically sync when the API starts or builds.
 * To manually update: cd packages/api && npm run sync-types
 */
```

## 🐛 Troubleshooting

### Types Out of Sync

```bash
# If types seem stale, restart the API (auto-syncs)
cd packages/api
npm run dev

# Or manually sync
npm run sync-types
```

### OpenAPI Generation Fails

```bash
# Check Zod schemas are valid
cd packages/api
npm run generate:openapi

# Common issues:
# - Missing schema exports
# - Invalid Zod schema syntax
# - Circular dependencies
```

### TypeScript Errors After Sync

```bash
# Clear TypeScript cache
rm -rf packages/*/tsconfig.tsbuildinfo

# Restart TypeScript server in your IDE
# VSCode: Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Widget Shows Wrong Types

```bash
# Verify sync actually copied files
ls -la packages/widget/src/types/api.ts

# Check checksum
cat packages/api/.generated/checksum.json

# Force re-sync
cd packages/api
rm -rf .generated ../dashboard/src/types/api.ts ../widget/src/types/api.ts
npm run sync-types
```

## 🎯 Benefits

### Before Type Safety

```typescript
// Widget
interface Service {
  price: number;  // ❌ Wrong field name
  active: boolean; // ❌ Wrong field name
}

// Runtime error: 400 Bad Request
const booking = {
  scheduledFor: date,  // ❌ API expects 'bookingDate'
};
```

### After Type Safety

```typescript
// Widget automatically uses correct types
import type { Service } from './types/api';

const service: Service = {
  depositAmount: 1000,  // ✅ Correct
  isActive: true,       // ✅ Correct
};

// TypeScript error if wrong field
const booking = {
  scheduledFor: date,  // ❌ TypeScript error!
  bookingDate: date,   // ✅ Correct
};
```

## 📚 Additional Resources

### OpenAPI Specification

- View generated spec: `packages/api/openapi.json`
- Swagger UI: `http://localhost:4000/api-docs`
- [OpenAPI 3.0 Spec](https://swagger.io/specification/)

### Zod to OpenAPI

- [@asteasolutions/zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi)
- Automatically converts Zod schemas to OpenAPI

### TypeScript Generation

- [openapi-typescript](https://github.com/drwpow/openapi-typescript)
- Generates TypeScript types from OpenAPI specs

## 🚀 Next Steps

1. **Install dependencies** in API package (when npm registry is accessible)
2. **Start API** (types sync automatically): `cd packages/api && npm run dev`
3. **Update Widget** to use generated types (already done!)
4. **Update Dashboard** to use generated types (already done!)
5. **Test in development** - verify types sync on API start
6. **Document for team** - remind them to pull latest after API changes
7. **Deploy** - types sync automatically on build

## ✅ Checklist

- [ ] Dependencies installed
- [ ] OpenAPI spec generated
- [ ] Types synced to frontends
- [ ] Widget using generated types
- [ ] Dashboard using generated types
- [ ] Swagger UI accessible
- [ ] Pre-commit hook configured
- [ ] Team trained on workflow

---

**Questions?** See main README or check `/api-docs` for live API documentation.
