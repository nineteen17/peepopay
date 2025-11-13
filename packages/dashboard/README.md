# @peepopay/dashboard

**Tradie dashboard for PeepoPay**

Next.js 16 application for managing services, bookings, and Stripe Connect onboarding.

## 🚀 Features

- 📊 **Dashboard Overview** - Revenue, bookings, and service statistics
- 🔐 **Better Auth** - Secure authentication with Google OAuth + Email/Password
- 📝 **Service Management** - Create, edit, and manage services
- 📅 **Booking Management** - View and manage customer bookings
- 💳 **Stripe Connect** - Complete onboarding and payment setup
- ⏰ **Availability Management** - Set working hours and blocked slots
- 👤 **Profile Management** - Update business information
- 📱 **Responsive Design** - Mobile-first with shadcn/ui
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- 🌙 **Dark Mode Ready** - Theme support built-in
- 🔒 **Type Safety** - Auto-generated TypeScript types from API schemas

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 16 (Static Export / CSR) |
| **React** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Components** | shadcn/ui |
| **Data Fetching** | TanStack Query (React Query) |
| **HTTP Client** | Axios |
| **Auth** | Better Auth |
| **Forms** | React Hook Form + Zod |
| **State** | React hooks |
| **Icons** | Lucide React |
| **Language** | TypeScript 5 |
| **Type Safety** | Auto-generated API types |

## 📁 Project Structure

```
packages/dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/            # Login page
│   │   └── register/         # Registration page
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   ├── page.tsx          # Dashboard home
│   │   ├── services/         # Service management
│   │   ├── bookings/         # Booking management
│   │   ├── availability/     # Availability settings
│   │   ├── stripe/           # Stripe onboarding
│   │   └── profile/          # Profile settings
│   │
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── api/                  # API routes (if any)
│
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── Header.tsx        # Top header
│   │   └── Footer.tsx        # Footer
│   │
│   └── features/
│       ├── ServiceForm.tsx   # Service create/edit form
│       ├── BookingCard.tsx   # Booking display card
│       └── StatsCard.tsx     # Statistics cards
│
├── lib/
│   ├── utils.ts              # Utility functions
│   ├── api.ts                # API client
│   └── auth.ts               # Auth helpers
│
├── types/
│   └── api.ts                # Auto-generated API types (DO NOT EDIT)
├── public/                   # Static assets
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Running PeepoPay API (port 4000)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your API URL
```

### Development

```bash
# Start dev server (port 3000)
npm run dev

# Access dashboard
# http://localhost:3000
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🔧 Environment Variables

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## 🔒 Type Safety & Automated Sync

The dashboard uses **auto-generated TypeScript types** from the API's Zod schemas with **automated synchronization**:

```typescript
// Import auto-generated types from API
import type { Service, NewService, Booking, BookingStatus } from '@/types/api';

// ✅ Compile-time type safety with TanStack Query
const { data: services } = useServices(); // Fully typed: { services: Service[] }

// ✅ TypeScript enforces correct fields in mutations
const { mutate: createService } = useCreateService();
createService({
  name: 'Plumbing Fix',
  duration: 120,
  depositAmount: 5000, // cents
  depositType: 'fixed', // Only 'fixed' | 'percentage' allowed
});

// ✅ Auto-complete for booking status updates
const { mutate: updateStatus } = useUpdateBookingStatus();
updateStatus({ 
  id: bookingId, 
  status: 'confirmed' // Only valid booking statuses allowed
});

// ✅ Health endpoint monitoring with typed responses
const { data: health } = useHealth();
health?.services.database.status; // 'up' | 'down'
```

### Automated Workflow

Types are **automatically synced** whenever you start the dashboard:

1. ✅ **API generates OpenAPI spec** from Zod schemas (`npm run generate:openapi`)
2. ✅ **TypeScript types generated** from OpenAPI using `openapi-typescript`
3. ✅ **Helper types added** (BookingStatus, ServiceListResponse, etc.)
4. ✅ **Types copied to dashboard** (`packages/dashboard/src/types/api.ts`)
5. ✅ **100% endpoint coverage** with type safety across 14 API endpoints

**Coverage:** All 14 API endpoints covered with shared types, including the health endpoint for monitoring.

**Benefits:**
- Zero manual type maintenance
- Catch API breaking changes at compile-time
- Auto-complete for all API fields and responses
- Refactor with confidence across monorepo
- Types stay in sync automatically on every build

See [TYPE_SAFETY_SETUP.md](../../TYPE_SAFETY_SETUP.md) for technical details.

## 📊 API Schema Reference

### Service Entity

```typescript
interface Service {
  id: string;
  userId: string;

  // Service details
  name: string;
  description: string | null;
  duration: number;  // In minutes

  // Pricing
  depositAmount: number;     // Amount in cents (or percentage if depositType is 'percentage')
  depositType: 'percentage' | 'fixed';  // How deposit is calculated
  depositPercentage: number | null;     // Deprecated
  fullPrice: number | null;            // Total service price in cents

  // Settings
  isActive: boolean | null;
  requiresApproval: boolean | null;

  // Timestamps
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

**Key Fields:**
- `depositType`: Determines if deposit is a fixed amount or percentage
- `depositAmount`: Amount in cents OR percentage (1-100) depending on depositType
- `fullPrice`: Optional total service cost for reference
- `requiresApproval`: If true, bookings require manual confirmation

### Booking Entity

```typescript
interface Booking {
  id: string;
  userId: string;
  serviceId: string;

  // Customer details (all required)
  customerName: string;       // 2-100 characters
  customerEmail: string;      // Valid email
  customerPhone: string;      // 10-20 characters (required)
  customerAddress: string | null;  // Optional, max 500 chars

  // Booking details
  bookingDate: string;        // ISO 8601
  duration: number;           // In minutes
  notes: string | null;       // Max 1000 characters

  // Payment
  depositAmount: number;      // Amount in cents
  depositStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

  // Stripe
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;

  // Metadata
  metadata: Record<string, any> | null;

  // Timestamps
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

**Status Flow:**
- `pending` → `confirmed` → `completed` (or `cancelled` at any point)
- `depositStatus` tracks payment separately from booking status

### User Entity

```typescript
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  businessName: string | null;
  slug: string | null;         // Unique URL-friendly identifier
  image: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

**Important Changes from Previous Versions:**
- `customerPhone` is now **required** in bookings (was optional)
- `customerAddress` is now available (optional)
- `depositType` field supports both fixed and percentage deposits
- `requiresApproval` flag enables manual booking confirmation workflow

## 📱 Pages & Features

### Authentication

**Login** (`/login`)
- Email/password authentication
- Google OAuth option
- Remember me functionality
- Password reset link

**Register** (`/register`)
- New account creation
- Business information collection
- Email verification
- Automatic login after signup

### Dashboard Home

**Overview** (`/dashboard`)
- Total revenue (current month)
- Pending bookings count
- Active services count
- Recent bookings list
- Quick actions

### Services

**Service List** (`/dashboard/services`)
- All services table
- Create new service button
- Edit/delete actions
- Active/inactive toggle
- Search and filter

**Create/Edit Service** (`/dashboard/services/new`, `/dashboard/services/[id]/edit`)
- Service name
- Description
- Deposit amount (in dollars or percentage)
- Deposit type (fixed amount or percentage)
- Full price (optional, for reference)
- Duration (minutes)
- Requires approval toggle
- Active status toggle
- Form validation with Zod

### Bookings

**Booking List** (`/dashboard/bookings`)
- All bookings table with pagination
- Filter by status (pending, confirmed, completed, cancelled)
- Filter by date range
- Customer information
- Payment status
- Actions (confirm, cancel)

**Booking Details** (`/dashboard/bookings/[id]`)
- Full booking information
- Customer details
- Service details
- Payment information
- Status history
- Actions menu

### Availability

**Availability Management** (`/dashboard/availability`)
- Set working hours per day
- Configure time slots
- Block specific dates
- Set break times
- Recurring schedules

### Stripe Connect

**Onboarding** (`/dashboard/stripe`)
- Stripe account status
- Onboarding progress
- Complete verification
- Dashboard link
- Payment settings

### Profile

**Profile Settings** (`/dashboard/profile`)
- Personal information
- Business details
- Contact information
- Avatar upload
- Timezone settings
- Account management

## 🎨 UI Components

### shadcn/ui Components Used

```typescript
// Installed components
- Button
- Card
- Form
- Input
- Label
- Select
- Table
- Dialog
- DropdownMenu
- Sheet
- Toast
- Badge
- Avatar
- Separator
- Tabs
```

### Adding New Components

```bash
# Add a component
npx shadcn-ui@latest add [component-name]

# Example: Add a calendar
npx shadcn-ui@latest add calendar
```

## 🔌 API Integration

### Axios-Based HTTP Client

```typescript
// lib/api.ts - Type-safe Axios client
import axios, { AxiosInstance } from 'axios';
import type { Service, Booking, User, HealthResponse } from '@/types/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true, // Auth cookies
    });
  }

  // All methods are fully type-safe
  async getServices(): Promise<{ services: Service[] }> { ... }
  async createService(data: NewService): Promise<{ service: Service }> { ... }
  async updateBookingStatus(id: string, status: Booking['status']): Promise<BookingResponse> { ... }
  async getHealth(): Promise<HealthResponse> { ... }
}

export const api = new ApiClient();
```

### TanStack Query Integration

```typescript
// hooks/queries.ts - React Query hooks
import { useQuery, useMutation } from '@tanstack/react-query';

// Type-safe data fetching with caching
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => api.getServices(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Automatic cache invalidation on mutations
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }) => api.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

### Health Monitoring

```typescript
// Automatic health checks with background refetching
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refresh every minute
  });
}
```

## 🔐 Authentication Flow

### Protected Routes

```typescript
// app/(dashboard)/layout.tsx
export default async function DashboardLayout({
  children,
}: {
  children: React.Node;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <div>{children}</div>;
}
```

### Login

```typescript
'use client';
import { signIn } from 'better-auth/react';

const handleLogin = async (email: string, password: string) => {
  await signIn.email({ email, password });
  router.push('/dashboard');
};
```

### Logout

```typescript
'use client';
import { signOut } from 'better-auth/react';

const handleLogout = async () => {
  await signOut();
  router.push('/login');
};
```

## 🎨 Theming

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Dark Mode

```typescript
// Toggle dark mode
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();

// Toggle
setTheme(theme === 'dark' ? 'light' : 'dark');
```

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# E2E tests
npm run test:e2e
```

**Note:** Tests are not yet implemented. Consider adding:
- Vitest for unit tests
- Playwright for E2E tests
- React Testing Library for component tests

## 🐳 Docker

### Development

```bash
# Start with Docker Compose
docker-compose -f ../../docker-compose.dev.yml up dashboard
```

### Production

```bash
# Build image
docker build -t peepopay-dashboard .

# Run container
docker run -p 3000:3000 peepopay-dashboard
```

## 📈 Performance

### Next.js Optimizations

- **Server Components** - Default for all pages
- **Image Optimization** - next/image for all images
- **Font Optimization** - next/font for web fonts
- **Code Splitting** - Automatic route-based splitting
- **Static Generation** - Where possible

### Recommended Practices

```typescript
// Use dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'));

// Optimize images
import Image from 'next/image';
<Image src="/logo.png" alt="Logo" width={200} height={50} />

// Use Server Components by default
// Only use 'use client' when necessary
```

## 🔒 Security

- **CSRF Protection** - Better Auth handles CSRF
- **XSS Protection** - React automatic escaping
- **Secure Cookies** - HTTPOnly, Secure, SameSite
- **Environment Variables** - Never expose secrets to client
- **Content Security Policy** - Configure in next.config.js

## 🐛 Troubleshooting

### Dashboard Not Loading

1. Check API is running on correct URL
2. Verify CORS settings on API
3. Check browser console for errors
4. Confirm environment variables are set

### Authentication Issues

1. Check Better Auth configuration
2. Verify API session endpoints
3. Clear cookies and try again
4. Check browser console for auth errors

### Styling Issues

1. Ensure Tailwind is properly configured
2. Check shadcn/ui component installation
3. Run `npm run build` to rebuild
4. Clear .next cache: `rm -rf .next`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Better Auth Documentation](https://better-auth.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)

## 🚀 Future Enhancements

- [ ] Analytics dashboard with charts
- [ ] Email templates customization
- [ ] Bulk booking operations
- [ ] Export bookings to CSV
- [ ] Calendar view for bookings
- [ ] Customer database
- [ ] Invoice generation
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] Advanced reporting

## 🤝 Contributing

See main project [CONTRIBUTING.md](../../CONTRIBUTING.md)

## 📄 License

MIT
