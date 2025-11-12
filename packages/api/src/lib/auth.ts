import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import { config } from '../config/index.js';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: config.nodeEnv === 'production',
    sendResetPassword: async ({ user, url }) => {
      console.log(`📧 Sending password reset email to ${user.email}`);
      try {
        await sendPasswordResetEmail(
          user.email,
          user.name || 'User',
          url,
          undefined,
          '1 hour'
        );
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`📧 Sending verification email to ${user.email}`);
      try {
        await sendVerificationEmail(
          user.email,
          user.name || 'User',
          url,
          undefined,
          '24 hours'
        );
      } catch (error) {
        console.error('Failed to send verification email:', error);
        throw error;
      }
    },
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

  // Hooks for additional email notifications
  hooks: {
    after: [
      {
        matcher: (context) => context.path === '/sign-up/email',
        handler: async (context) => {
          if (context.body?.user) {
            const user = context.body.user;
            console.log(`📧 Sending welcome email to ${user.email}`);
            try {
              // Send welcome email (non-blocking)
              sendWelcomeEmail(user.email, user.name || 'User').catch((error) =>
                console.error('Failed to send welcome email:', error)
              );
            } catch (error) {
              // Don't block signup if welcome email fails
              console.error('Error in welcome email hook:', error);
            }
          }
        },
      },
    ],
  },
});

export type Auth = typeof auth;
