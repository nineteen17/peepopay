# Type Safety Setup Guide

Complete guide for setting up auto-synced type safety across API, Dashboard, and Widget.

## 🎯 Overview

This setup provides **compile-time type safety** across all packages without monorepo dependencies. Types are automatically generated from API Zod schemas and synced to frontends.

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
# Root dependencies
npm install -D tsx@^4.7.0 openapi-typescript@^6.7.3

# API dependencies
cd packages/api
npm install @asteasolutions/zod-to-openapi@^7.0.0 swagger-ui-express@^5.0.0
npm install -D @types/swagger-ui-express@^4.1.6
```

**Note:** If npm registry is blocked, you can install these later. All implementation files are already created.

### 2. Verify Installation

```bash
# Check if tsx is available
tsx --version

# Check if openapi-typescript is available
npx openapi-typescript --version
```

## 🔄 Usage

### Generate OpenAPI Spec

```bash
# From API directory
cd packages/api
npm run generate:openapi

# Output: packages/api/openapi.json
```

### Sync Types to Frontends

```bash
# From root directory
npm run sync-types

# This will:
# 1. Generate OpenAPI spec from Zod schemas
# 2. Generate TypeScript types from OpenAPI
# 3. Copy types to Dashboard (src/types/api.ts)
# 4. Copy types to Widget (src/types/api.ts)
# 5. Create checksum for validation
```

### Validate Types

```bash
# Check if types are in sync
npm run validate-types

# Use in pre-commit hooks
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

### 2. Sync Types

```bash
# From root
npm run sync-types
```

### 3. Use in Widget

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

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run validate-types"
    }
  }
}
```

Prevents committing out-of-sync types.

## 📁 Generated Files

### Location

```
.generated/
├── api-types.ts          # Master generated types
└── checksum.json         # Validation checksum

packages/api/
└── openapi.json          # OpenAPI 3.0 specification

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
 * To update: npm run sync-types
 */
```

## 🐛 Troubleshooting

### Types Out of Sync

```bash
# Error: Types are out of sync!
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
cat .generated/checksum.json

# Force re-sync
rm -rf .generated packages/*/src/types/api.ts
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

1. **Install dependencies** (when npm registry is accessible)
2. **Run initial sync**: `npm run sync-types`
3. **Update Widget** to use generated types
4. **Update Dashboard** to use generated types
5. **Add pre-commit hook** for validation
6. **Test in development**
7. **Document for team**

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
