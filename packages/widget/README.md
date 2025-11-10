# @peepopay/widget

**Embeddable booking widget for PeepoPay**

React 19 + Vite static widget for seamless customer bookings with Stripe payments.

## 🚀 Features

- 🎯 **Multi-Step Booking Flow** - Service selection → Date/time → Customer info → Payment
- 💳 **Stripe Elements** - Secure payment processing with Stripe Connect
- 📅 **Date/Time Picker** - Weekly calendar with time slot selection
- 📱 **Responsive Design** - Mobile-first with Tailwind CSS
- ⚡ **Vite Build** - Lightning-fast development and optimized production builds
- 🐳 **Docker Ready** - Nginx-based production deployment
- 🎨 **Customizable** - Tailwind CSS with custom color schemes

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | React 19 |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS 3 |
| **Payments** | Stripe Elements |
| **Icons** | Lucide React |
| **Language** | TypeScript 5 |
| **Server** | Nginx (production) |

## 🎨 Widget Flow

```
1. Service Selection
   ↓
2. Date & Time Selection
   ↓
3. Customer Information
   ↓
4. Payment (Stripe)
   ↓
5. Confirmation
```

## 📁 Project Structure

```
packages/widget/
├── src/
│   ├── components/
│   │   ├── BookingWidget.tsx    # Main widget component
│   │   ├── ServiceSelection.tsx # Step 1: Choose service
│   │   ├── DateTimePicker.tsx   # Step 2: Pick date/time
│   │   └── CustomerForm.tsx     # Step 3: Customer details
│   │
│   ├── App.tsx                  # Stripe provider wrapper
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Tailwind imports
│   └── vite-env.d.ts
│
├── public/                      # Static assets
├── dist/                        # Built files (production)
├── Dockerfile                   # Production nginx build
├── nginx.conf                   # Nginx configuration
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
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

# Edit .env with your API URL and Stripe key
```

### Development

```bash
# Start dev server (port 5173)
npm run dev

# Access widget
# http://localhost:5173
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔧 Environment Variables

```env
# API URL (your PeepoPay API)
VITE_API_URL=http://localhost:4000

# Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Important:** All environment variables must be prefixed with `VITE_` to be accessible in the browser.

## 📱 Component Breakdown

### BookingWidget.tsx

Main widget component managing state and flow:

```typescript
interface BookingWidgetProps {
  tradieSlug: string;  // Username/slug of tradie
}
```

**State Management:**
- Current step (1-4)
- Selected service
- Selected date/time
- Customer information
- Payment processing state

**Steps:**
1. Service selection
2. Date & time picker
3. Customer form
4. Payment (Stripe Elements)
5. Success confirmation

### ServiceSelection.tsx

Displays available services for a tradie:

```typescript
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;        // In cents
  duration: number;     // In minutes
  depositAmount: number; // In cents
}
```

**Features:**
- Fetches services from `/api/services/user/{slug}`
- Shows service details with pricing
- Loading and error states
- Empty state handling

### DateTimePicker.tsx

Weekly calendar with time slot selection:

```typescript
interface DateTimePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}
```

**Features:**
- 7-day week view
- Navigate between weeks
- Prevents past date selection
- Hourly time slots (9 AM - 5 PM)
- Selected date highlighting

### CustomerForm.tsx

Customer information collection:

```typescript
interface CustomerInfo {
  fullName: string;
  email: string;
  phone?: string;
  notes?: string;
}
```

**Validation:**
- Required: Full name, email
- Optional: Phone, notes
- HTML5 email validation

## 💳 Stripe Integration

### Payment Flow

1. Customer submits booking
2. API creates booking and payment intent
3. Widget receives `clientSecret`
4. Stripe Elements handles card input
5. Payment confirmation
6. Success screen displayed

### Stripe Elements Configuration

```typescript
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Elements options
const options = {
  clientSecret: clientSecret,
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#3b82f6',
    }
  }
};
```

## 🎨 Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
      },
    },
  },
};
```

### Custom Styles

Modify `src/index.css` for global styles or `tailwind.config.js` for theme customization.

## 🐳 Docker Deployment

### Production Build

The widget uses a multi-stage Docker build:

1. **Builder stage** - Vite build
2. **Production stage** - Nginx serving static files

```dockerfile
# Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

### Nginx Configuration

```nginx
server {
    listen 8080;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache static assets (1 year)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        return 200 "healthy\n";
    }
}
```

### Running with Docker

```bash
# Build image
docker build -t peepopay-widget .

# Run container
docker run -p 8080:8080 peepopay-widget

# Access widget
# http://localhost:8080
```

### Docker Compose

```bash
# Development
docker-compose -f ../../docker-compose.dev.yml up widget

# Production
docker-compose -f ../../docker-compose.yml up widget
```

## 🌐 Embedding the Widget

### Option 1: Direct Embed

```html
<iframe
  src="https://widget.peepopay.com?tradie=john-plumber"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

### Option 2: JavaScript Embed (Future)

```html
<div id="peepopay-widget" data-tradie="john-plumber"></div>
<script src="https://widget.peepopay.com/embed.js"></script>
```

**Note:** The JavaScript embed script is not yet implemented.

## 🔍 API Integration

### Endpoints Used

```typescript
// Get services for a tradie
GET /api/services/user/:slug

// Create booking
POST /api/bookings
{
  serviceId: string;
  bookingDate: string;  // ISO 8601
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  depositAmount: number;
}

// Response includes clientSecret for Stripe
{
  booking: {...},
  clientSecret: string
}
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

## 📈 Performance

### Optimization Features

- **Code splitting** - Vite automatic splitting
- **Asset optimization** - Image compression
- **Gzip compression** - Nginx configuration
- **Browser caching** - 1-year cache for assets
- **CDN ready** - Static build suitable for CDN

### Build Size

```bash
npm run build

# Typical output sizes:
# dist/index.html         ~2 KB
# dist/assets/index.js    ~150 KB (gzipped ~50 KB)
# dist/assets/index.css   ~5 KB (gzipped ~2 KB)
```

## 🔒 Security

- **CORS** - Configured on API side
- **Stripe Elements** - PCI compliant payment handling
- **No sensitive data** - API keys in environment variables only
- **HTTPS required** - Production must use HTTPS
- **Content Security Policy** - Configure in Nginx

## 🐛 Troubleshooting

### Widget Not Loading

1. Check API is running on correct URL
2. Verify CORS settings on API
3. Check browser console for errors
4. Confirm Stripe publishable key is correct

### Payment Not Working

1. Check Stripe key matches API environment
2. Verify webhook is configured
3. Check browser console for Stripe errors
4. Test with Stripe test card: `4242 4242 4242 4242`

### Styling Issues

1. Ensure Tailwind is properly configured
2. Run `npm run build` to rebuild CSS
3. Check for conflicting CSS from parent page
4. Use browser dev tools to inspect styles

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Stripe Elements](https://stripe.com/docs/stripe-js)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

## 🚀 Future Enhancements

- [ ] Availability checking (dynamic time slots)
- [ ] Email validation with Zod
- [ ] Phone number formatting
- [ ] Multiple date selection
- [ ] Service images
- [ ] Timezone support
- [ ] embed.js script for easier integration
- [ ] Dark mode support
- [ ] Multiple payment methods
- [ ] Booking modifications

## 🤝 Contributing

See main project [CONTRIBUTING.md](../../CONTRIBUTING.md)

## 📄 License

MIT
