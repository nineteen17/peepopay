import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import { config } from '../config/index.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },

  socialProviders: {
    google: {
      clientId: config.betterAuth.google.clientId || '',
      clientSecret: config.betterAuth.google.clientSecret || '',
      enabled: !!(config.betterAuth.google.clientId && config.betterAuth.google.clientSecret),
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  advanced: {
    cookiePrefix: 'peepopay',
  },
});

export type Auth = typeof auth;
