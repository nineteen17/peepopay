import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // App
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '4000'),
  apiUrl: process.env.API_URL || 'http://localhost:4000',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwtSecret: process.env.JWT_SECRET!,

  // Better Auth
  betterAuth: {
    secret: process.env.BETTER_AUTH_SECRET!,
    url: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    clientId: process.env.STRIPE_CLIENT_ID!,
  },

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',

  // Email - Resend
  email: {
    apiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || 'noreply@peepopay.com',
    fromName: process.env.FROM_NAME || 'PeepoPay',
  },

  // CORS
  cors: {
    origins: [
      'http://localhost:3000', // Dashboard
      'http://localhost:5173', // Widget
      process.env.DASHBOARD_URL,
      process.env.WIDGET_URL,
    ].filter(Boolean) as string[],
  },
} as const;

// Validate required env vars
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'BETTER_AUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_CLIENT_ID',
  'RESEND_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
