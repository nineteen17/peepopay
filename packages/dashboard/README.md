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
| **Framework** | Next.js 16 |
| **React** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Components** | shadcn/ui |
| **Auth** | Better Auth |
| **Forms** | React Hook Form + Zod |
| **State** | React hooks |
| **Icons** | Lucide React |
| **Language** | TypeScript 5 |

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

## 🔒 Type Safety

The dashboard uses **auto-generated TypeScript types** from the API's Zod schemas:

```typescript
// Import auto-generated types
import type { Service, NewService, Booking } from '@/types/api';

// ✅ Compile-time type safety
const [services, setServices] = useState<Service[]>([]);

// ✅ TypeScript enforces correct fields
const createService = async (data: NewService) => {
  const response = await fetch('/api/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // TypeScript error if fields are wrong!
};

// ✅ Auto-complete for API responses
const booking: Booking = await response.json();
booking.bookingDate; // TypeScript knows this exists!
```

**Benefits:**
- Catch API mismatches at compile-time
- Auto-complete for API fields
- Refactor with confidence
- Types stay in sync automatically

See [TYPE_SAFETY_SETUP.md](../../TYPE_SAFETY_SETUP.md) for more details.

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
- Price (in dollars)
- Deposit amount
- Duration (minutes)
- Active status
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

### API Client Setup

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Include cookies for auth
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

### Authenticated Requests

```typescript
// Better Auth provides session management
import { auth } from '@/lib/auth';

// In Server Components
const session = await auth();
if (!session) redirect('/login');

// In Client Components
'use client';
import { useSession } from 'better-auth/react';

const { data: session, status } = useSession();
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
